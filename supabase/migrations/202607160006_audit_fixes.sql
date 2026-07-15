-- 2026-07-16 — fixes from the full adversarial audit.
-- (1) Daily order numbering used count(*)+1, which collides after a mis-keyed
--     order is hard-deleted (admin_delete_order), aborting on the unique
--     order_number and blocking ALL orders that day. Use max(existing seq)+1,
--     which is always free of an existing number.
-- (2) A non-owner admin could suspend/demote the OWNER via a raw PostgREST
--     profiles UPDATE (the trigger pinned is_owner but not status/role), locking
--     the owner out. Pin the owner's status/role against direct updates.
-- (3) admin_delete_order could destroy an already-paid order's value. Block
--     deleting an approved order once its debt is (partly) paid — cancel instead.

-- ── (1) _place_order with collision-free daily numbering ───────────────────
create or replace function public._place_order(
  target_customer uuid,
  actor uuid,
  items jsonb,
  shipping_address_id uuid,
  customer_note text,
  shipping_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_id uuid := gen_random_uuid();
  order_total numeric(12,2) := 0;
  order_total_before_discount numeric(12,2) := 0;
  order_discount_total numeric(12,2) := 0;
  customer_discount_per_unit numeric(12,2) := 0;
  locked_floor integer := 0;
  cust_floor integer := 0;
  total_pieces integer := 0;
  tier_discount numeric(12,2) := 0;
  chosen_method text := case when shipping_method = 'grab' then 'grab' else 'flash' end;
  day_code text := to_char((now() at time zone 'Asia/Bangkok'), 'DDMMYY');
  daily_seq integer;
  item record;
  product_row record;
  current_qty integer;
  after_qty integer;
  address_row public.customer_addresses%rowtype;
  category_discount numeric(12,2);
  item_base_price numeric(12,2);
  item_unit_price numeric(12,2);
  item_discount_per_unit numeric(12,2);
  item_line_total numeric(12,2);
  item_line_discount numeric(12,2);
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Order items are required';
  end if;

  select greatest(coalesce(per_item_discount, 0), 0), coalesce(locked_floor_quantity, 0)
    into customer_discount_per_unit, locked_floor
  from public.profiles
  where id = target_customer;

  cust_floor := greatest(
    public.price_program_floor_quantity(target_customer, (now() at time zone 'Asia/Bangkok')),
    coalesce(locked_floor, 0)
  );

  select coalesce(sum(quantity), 0)::integer
    into total_pieces
  from jsonb_to_recordset(items) as x(product_id uuid, quantity integer);

  select t.discount_amount
    into tier_discount
  from public.price_tiers t
  where t.min_quantity <= greatest(total_pieces, cust_floor)
  order by t.min_quantity desc
  limit 1;
  tier_discount := coalesce(tier_discount, 0);

  if shipping_address_id is not null then
    select * into address_row
    from public.customer_addresses
    where id = shipping_address_id and customer_id = target_customer;

    if not found then
      raise exception 'Shipping address not found';
    end if;
  end if;

  -- Serialize same-day numbering so two concurrent orders can't take the same
  -- daily sequence (unique order_number would abort the loser otherwise).
  perform pg_advisory_xact_lock(hashtext('nak_order_number_' || day_code));

  -- Highest existing same-day sequence + 1. NOT count(*)+1 — after a mis-keyed
  -- order is hard-deleted, count would reuse an existing number and abort on the
  -- unique constraint, blocking all further orders that day. max+1 can only reuse
  -- a NUMBER THAT NO LONGER EXISTS, so it never collides.
  select coalesce(max((split_part(order_number, '-', 1))::int), 0) + 1
    into daily_seq
  from public.orders
  where order_number ~ ('^[0-9]+-' || day_code || '$');

  insert into public.orders (
    id, order_number, customer_id, status, customer_note,
    shipping_address_id, shipping_snapshot, shipping_method
  )
  values (
    order_id,
    lpad(daily_seq::text, 2, '0') || '-' || day_code,
    target_customer,
    'pending_admin',
    nullif(customer_note, ''),
    shipping_address_id,
    case when shipping_address_id is null then null else to_jsonb(address_row) end,
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

    select p.id, p.sku, p.name, p.unit, p.price, p.category_id
      into product_row
    from public.products p
    where p.id = item.product_id and p.is_active = true;

    if not found then
      raise exception 'Product is not available';
    end if;

    select quantity_available into current_qty
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

    select d.discount_amount into category_discount
    from public.customer_category_discounts d
    where d.customer_id = target_customer and d.category_id = product_row.category_id;

    item_unit_price := greatest(
      item_base_price - tier_discount - coalesce(category_discount, 0) - customer_discount_per_unit,
      0
    );
    item_discount_per_unit := item_base_price - item_unit_price;
    item_line_total := item_unit_price * item.quantity;
    item_line_discount := item_discount_per_unit * item.quantity;
    after_qty := current_qty - item.quantity;

    update public.inventory set quantity_available = after_qty where product_id = item.product_id;

    insert into public.order_items (
      order_id, product_id, product_name, sku, unit, unit_price,
      unit_price_before_discount, discount_per_unit, quantity, line_total, line_discount_total
    )
    values (
      order_id, product_row.id, product_row.name, product_row.sku, product_row.unit, item_unit_price,
      item_base_price, item_discount_per_unit, item.quantity, item_line_total, item_line_discount
    );

    insert into public.inventory_movements (
      product_id, type, quantity_delta, quantity_after, order_id, note, created_by
    )
    values (
      item.product_id, 'order_reserved', -item.quantity, after_qty, order_id,
      'Stock reserved immediately on order submission', actor
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
  values ('order_submitted', target_customer, order_id, jsonb_build_object('order_id', order_id), 'queued');

  return order_id;
end;
$$;

revoke execute on function public._place_order(uuid, uuid, jsonb, uuid, text, text) from public, anon, authenticated;

-- ── (2) Protect the owner account's status/role from raw admin UPDATEs ─────
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
    -- The owner account's status/role can only move through the SECURITY DEFINER
    -- RPCs (owner_set_owner_flag transfers ownership; suspend/approve refuse owner
    -- targets). Block a raw profiles UPDATE so a non-owner admin can't suspend or
    -- demote the owner and lock them out.
    if old.is_owner then
      new.status = old.status;
      new.role = old.role;
    end if;
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

-- ── (3) admin_delete_order: never delete an already-paid order ─────────────
create or replace function public.admin_delete_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_row public.orders%rowtype;
  item record;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can delete orders';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_row.status in ('shipping', 'delivered') then
    raise exception 'Cannot delete an order that has already shipped';
  end if;

  -- Once debt is applied, if the customer's outstanding debt is already below
  -- this order's value, a payment has been applied against it — hard-deleting
  -- would silently lose that money. Cancel (keeps a reconciling record) instead.
  if order_row.status in ('approved', 'packing', 'ready_to_ship')
     and order_row.debt_applied_at is not null
     and (select coalesce(debt_balance, 0) from public.profiles where id = order_row.customer_id) < order_row.subtotal then
    raise exception 'Order already partly paid — cancel it instead of deleting';
  end if;

  -- Restore stock still reserved (active statuses; cancelled/rejected already were).
  if order_row.status in ('pending_admin', 'approved', 'packing', 'ready_to_ship') then
    for item in
      select product_id, quantity from public.order_items where order_id = target_order_id
    loop
      update public.inventory
      set quantity_available = quantity_available + item.quantity
      where product_id = item.product_id;
    end loop;
  end if;

  -- Reverse applied debt (safe now: guaranteed debt_balance >= subtotal above).
  if order_row.status in ('approved', 'packing', 'ready_to_ship')
     and order_row.debt_applied_at is not null then
    perform set_config('app.allow_profile_account_mutation', 'on', true);
    update public.profiles
    set debt_balance = greatest(0, debt_balance - order_row.subtotal)
    where id = order_row.customer_id;
  end if;

  delete from public.account_transactions where order_id = target_order_id;
  delete from public.inventory_movements where order_id = target_order_id;
  delete from public.orders where id = target_order_id;
end;
$$;

grant execute on function public.admin_delete_order(uuid) to authenticated;
revoke execute on function public.admin_delete_order(uuid) from public, anon;
