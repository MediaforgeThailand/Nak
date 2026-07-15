-- 2026-07-16
-- 1. Per-customer special discounts move from per-PRODUCT to per-CATEGORY.
--    New table customer_category_discounts; the pricing now looks the discount
--    up by the product's category. The old customer_product_discounts table is
--    left in place (legacy) but is no longer read by pricing or the admin UI.
-- 2. Admins can place orders ON BEHALF OF a customer. The whole pricing +
--    inventory + numbering routine is factored into an internal _place_order so
--    create_order (customer) and admin_create_order (admin) can't diverge.

-- ── 1. Per-customer, per-CATEGORY special discount (admin managed) ─────────
create table if not exists public.customer_category_discounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.product_categories(id) on delete cascade,
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, category_id)
);

create index if not exists customer_category_discounts_category_idx
  on public.customer_category_discounts(category_id);

drop trigger if exists customer_category_discounts_touch_updated_at on public.customer_category_discounts;
create trigger customer_category_discounts_touch_updated_at
before update on public.customer_category_discounts
for each row execute function public.touch_updated_at();

alter table public.customer_category_discounts enable row level security;

drop policy if exists "Customers read own category discounts" on public.customer_category_discounts;
create policy "Customers read own category discounts"
on public.customer_category_discounts for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "Admins manage category discounts" on public.customer_category_discounts;
create policy "Admins manage category discounts"
on public.customer_category_discounts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ── 2. Shared order engine ────────────────────────────────────────────────
-- Internal: prices + reserves stock + writes the order for `target_customer`,
-- attributing stock movements to `actor` (who may be the customer or an admin).
-- Not callable directly — only the two SECURITY DEFINER wrappers below reach it.
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

  -- Effective floor: higher of the rolling two-month rank and any admin lock.
  cust_floor := greatest(
    public.price_program_floor_quantity(target_customer, (now() at time zone 'Asia/Bangkok')),
    coalesce(locked_floor, 0)
  );

  -- Global ladder: tier from ALL pieces in this order (any product) or the
  -- effective floor, whichever is greater; applies to every line.
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
    target_customer,
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

    select p.id, p.sku, p.name, p.unit, p.price, p.category_id
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

    -- Per-customer special discount is now by CATEGORY.
    select d.discount_amount
      into category_discount
    from public.customer_category_discounts d
    where d.customer_id = target_customer
      and d.category_id = product_row.category_id;

    item_unit_price := greatest(
      item_base_price
        - tier_discount
        - coalesce(category_discount, 0)
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
      'Stock reserved immediately on order submission',
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
  values ('order_submitted', target_customer, order_id, jsonb_build_object('order_id', order_id), 'queued');

  return order_id;
end;
$$;

revoke execute on function public._place_order(uuid, uuid, jsonb, uuid, text, text) from public, anon, authenticated;

-- ── 3. Customer wrapper (unchanged signature) ─────────────────────────────
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
begin
  if actor is null or not public.is_approved_customer() then
    raise exception 'Only approved customers can create orders';
  end if;
  return public._place_order(actor, actor, items, shipping_address_id, customer_note, shipping_method);
end;
$$;

grant execute on function public.create_order(jsonb, uuid, text, text) to authenticated;
revoke execute on function public.create_order(jsonb, uuid, text, text) from public, anon;

-- ── 4. Admin wrapper: place an order for a chosen approved customer ────────
create or replace function public.admin_create_order(
  target_customer_id uuid,
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
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can place orders for customers';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = target_customer_id and role = 'customer' and status = 'approved'
  ) then
    raise exception 'Target is not an approved customer';
  end if;

  return public._place_order(target_customer_id, actor, items, shipping_address_id, customer_note, shipping_method);
end;
$$;

grant execute on function public.admin_create_order(uuid, jsonb, uuid, text, text) to authenticated;
revoke execute on function public.admin_create_order(uuid, jsonb, uuid, text, text) from public, anon;
