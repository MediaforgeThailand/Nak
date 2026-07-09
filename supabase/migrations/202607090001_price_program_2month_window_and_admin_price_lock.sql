-- Price Program v3:
-- 1. Two-month carry window. Reaching a quantity tier in ANY single calendar
--    month now grants that tier's price for the NEXT TWO months, not just one.
--    Implemented as: this month's pricing floor ("ยศ") =
--      greatest( approved qty last month, approved qty the month before ).
--    A strong month therefore keeps a customer's rank alive for two months
--    before it can decay.
-- 2. Admin price-level lock. An admin can pin a customer to a minimum tier via
--    profiles.locked_floor_quantity. The lock is a FLOOR: the customer always
--    gets at least that tier and never drops below it, even in a month with no
--    purchases; if their rolling volume earns a higher tier they still get the
--    higher one. locked_floor_quantity = 0 means "no lock".
--
-- Effective pricing floor used by create_order and price_program_status:
--   greatest( rolling 2-month floor, locked_floor_quantity )

-- ── 1. Locked floor column ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists locked_floor_quantity integer not null default 0
    check (locked_floor_quantity >= 0);

-- Protect the new column the same way per_item_discount / debt_balance are:
-- only a SECURITY DEFINER RPC that sets app.allow_profile_account_mutation may
-- change it, so neither customers nor admins can edit it by a direct table write.
create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('app.allow_profile_account_mutation', true) = 'on' then
    return new;
  end if;

  if public.is_admin() then
    new.is_owner = old.is_owner;
    new.per_item_discount = old.per_item_discount;
    new.locked_floor_quantity = old.locked_floor_quantity;
    new.debt_balance = old.debt_balance;
    return new;
  end if;

  new.role = old.role;
  new.status = old.status;
  new.debt_balance = old.debt_balance;
  new.per_item_discount = old.per_item_discount;
  new.locked_floor_quantity = old.locked_floor_quantity;
  new.is_owner = old.is_owner;
  new.approved_at = old.approved_at;
  new.approved_by = old.approved_by;
  return new;
end;
$$;

-- ── 2. Rolling two-month floor helper ─────────────────────────────────────
-- Pricing floor at `at_time`: the best of the two preceding Bangkok calendar
-- months, so a tier reached in one month is honoured for the following two.
create or replace function public.price_program_floor_quantity(
  target_customer_id uuid,
  at_time timestamp
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    public.price_program_month_quantity(target_customer_id, at_time - interval '1 month'),
    public.price_program_month_quantity(target_customer_id, at_time - interval '2 months')
  )
$$;

revoke execute on function public.price_program_floor_quantity(uuid, timestamp) from public, anon, authenticated;

-- ── 3. Admin sets the per-customer price-level lock ───────────────────────
create or replace function public.admin_set_customer_price_lock(
  target_customer_id uuid,
  locked_quantity integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can set the customer price lock';
  end if;

  if locked_quantity is null or locked_quantity < 0 then
    raise exception 'Locked quantity must be zero or greater';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set locked_floor_quantity = locked_quantity
  where id = target_customer_id
    and role = 'customer';

  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

grant execute on function public.admin_set_customer_price_lock(uuid, integer) to authenticated;
revoke execute on function public.admin_set_customer_price_lock(uuid, integer) from public, anon;

-- ── 4. Caller-facing status: effective floor = max(rolling 2-month, locked) ─
create or replace function public.price_program_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  bkk_now timestamp := (now() at time zone 'Asia/Bangkok');
  rolling integer;
  locked integer;
begin
  if actor is null then
    return jsonb_build_object(
      'floor_quantity', 0,
      'month_quantity', 0,
      'rolling_floor_quantity', 0,
      'locked_floor_quantity', 0
    );
  end if;

  rolling := public.price_program_floor_quantity(actor, bkk_now);
  select coalesce(locked_floor_quantity, 0) into locked
  from public.profiles
  where id = actor;
  locked := coalesce(locked, 0);

  return jsonb_build_object(
    'floor_quantity', greatest(rolling, locked),
    'month_quantity', public.price_program_month_quantity(actor, bkk_now),
    'rolling_floor_quantity', rolling,
    'locked_floor_quantity', locked
  );
end;
$$;

grant execute on function public.price_program_status() to authenticated;

-- ── 5. create_order: effective floor = max(rolling 2-month, admin lock) ────
-- Reproduces the current 4-arg create_order (daily order numbers, shipping
-- method, tier + product + personal discounts) and only changes how the
-- pricing floor is derived.
create or replace function public.create_order(
  items jsonb,
  shipping_address_id uuid default null,
  customer_note text default null,
  shipping_method text default 'flash'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_id uuid := gen_random_uuid();
  order_total numeric(12,2) := 0;
  order_total_before_discount numeric(12,2) := 0;
  order_discount_total numeric(12,2) := 0;
  customer_discount_per_unit numeric(12,2) := 0;
  locked_floor integer := 0;
  cust_floor integer := 0;
  chosen_method text := case when shipping_method = 'grab' then 'grab' else 'flash' end;
  day_code text := to_char((now() at time zone 'Asia/Bangkok'), 'DDMMYY');
  daily_seq integer;
  item record;
  product_row record;
  current_qty integer;
  after_qty integer;
  address_row public.customer_addresses%rowtype;
  tier_discount numeric(12,2);
  product_discount numeric(12,2);
  item_base_price numeric(12,2);
  item_unit_price numeric(12,2);
  item_discount_per_unit numeric(12,2);
  item_line_total numeric(12,2);
  item_line_discount numeric(12,2);
begin
  if actor is null or not public.is_approved_customer() then
    raise exception 'Only approved customers can create orders';
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Order items are required';
  end if;

  select greatest(coalesce(per_item_discount, 0), 0), coalesce(locked_floor_quantity, 0)
    into customer_discount_per_unit, locked_floor
  from public.profiles
  where id = actor;

  -- Effective floor: the higher of the rolling two-month rank and any admin
  -- price-level lock. So a locked customer never drops below their tier, and a
  -- customer who buys enough still climbs above the lock.
  cust_floor := greatest(
    public.price_program_floor_quantity(actor, (now() at time zone 'Asia/Bangkok')),
    coalesce(locked_floor, 0)
  );

  if shipping_address_id is not null then
    select * into address_row
    from public.customer_addresses
    where id = shipping_address_id and customer_id = actor;

    if not found then
      raise exception 'Shipping address not found';
    end if;
  end if;

  -- Serialize same-day numbering so two concurrent orders can't take the same
  -- daily sequence (unique order_number would abort the loser otherwise).
  perform pg_advisory_xact_lock(hashtext('nak_order_number_' || day_code));

  select count(*) + 1
    into daily_seq
  from public.orders
  where order_number like '%-' || day_code;

  insert into public.orders (
    id,
    order_number,
    customer_id,
    status,
    customer_note,
    shipping_address_id,
    shipping_snapshot,
    shipping_method
  )
  values (
    order_id,
    lpad(daily_seq::text, 2, '0') || '-' || day_code,
    actor,
    'pending_admin',
    nullif(customer_note, ''),
    shipping_address_id,
    case
      when shipping_address_id is null then null
      else to_jsonb(address_row)
    end,
    chosen_method
  );

  for item in
    select product_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(items) as x(product_id uuid, quantity integer)
    group by product_id
    order by product_id
  loop
    if item.quantity is null or item.quantity <= 0 then
      raise exception 'Invalid quantity';
    end if;

    select p.id, p.sku, p.name, p.unit, p.price
      into product_row
    from public.products p
    where p.id = item.product_id
      and p.is_active = true;

    if not found then
      raise exception 'Product is not available';
    end if;

    select quantity_available
      into current_qty
    from public.inventory
    where product_id = item.product_id
    for update;

    if not found then
      raise exception 'Inventory record missing';
    end if;

    if current_qty < item.quantity then
      raise exception 'Insufficient stock for %', product_row.name;
    end if;

    item_base_price := product_row.price;

    select t.discount_amount
      into tier_discount
    from public.product_price_tiers t
    where t.product_id = item.product_id
      and t.min_quantity <= greatest(item.quantity, cust_floor)
    order by t.min_quantity desc
    limit 1;

    select d.discount_amount
      into product_discount
    from public.customer_product_discounts d
    where d.customer_id = actor
      and d.product_id = item.product_id;

    item_unit_price := greatest(
      item_base_price
        - coalesce(tier_discount, 0)
        - coalesce(product_discount, 0)
        - customer_discount_per_unit,
      0
    );
    item_discount_per_unit := item_base_price - item_unit_price;
    item_line_total := item_unit_price * item.quantity;
    item_line_discount := item_discount_per_unit * item.quantity;
    after_qty := current_qty - item.quantity;

    update public.inventory
    set quantity_available = after_qty
    where product_id = item.product_id;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      sku,
      unit,
      unit_price,
      unit_price_before_discount,
      discount_per_unit,
      quantity,
      line_total,
      line_discount_total
    )
    values (
      order_id,
      product_row.id,
      product_row.name,
      product_row.sku,
      product_row.unit,
      item_unit_price,
      item_base_price,
      item_discount_per_unit,
      item.quantity,
      item_line_total,
      item_line_discount
    );

    insert into public.inventory_movements (
      product_id,
      type,
      quantity_delta,
      quantity_after,
      order_id,
      note,
      created_by
    )
    values (
      item.product_id,
      'order_reserved',
      -item.quantity,
      after_qty,
      order_id,
      'Stock reserved immediately on customer order submission',
      actor
    );

    order_total := order_total + item_line_total;
    order_total_before_discount := order_total_before_discount + (item_base_price * item.quantity);
    order_discount_total := order_discount_total + item_line_discount;
  end loop;

  update public.orders
  set subtotal = order_total,
      total_before_discount = order_total_before_discount,
      total_discount = order_discount_total
  where id = order_id;

  insert into public.line_notification_outbox(event_type, customer_id, order_id, payload, status)
  values ('order_submitted', actor, order_id, jsonb_build_object('order_id', order_id), 'queued');

  return order_id;
end;
$$;

grant execute on function public.create_order(jsonb, uuid, text, text) to authenticated;
revoke execute on function public.create_order(jsonb, uuid, text, text) from public, anon;
