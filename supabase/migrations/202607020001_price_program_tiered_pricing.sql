-- Price Program: per-product quantity-tier pricing with monthly accumulation.
--
-- 1. product_price_tiers: quantity ladder per product (min_quantity → unit_price).
-- 2. Monthly rank ("ยศ"): the customer's total approved purchase quantity in the
--    PREVIOUS calendar month (Asia/Bangkok) acts as a quantity FLOOR this month —
--    every order line is priced as if its quantity were at least that floor,
--    so a customer who bought 600 pcs last month pays the 500-tier price even
--    when ordering 20 at a time. The floor is recomputed every month from the
--    previous month only, so under-buying one month drops the rank the next.
-- 3. price_program_status(): returns the caller's floor + current-month
--    accumulation for the customer-facing Price Program page.
-- 4. create_order: prices each line from the ladder at
--    greatest(line quantity, floor), minus the personal per-item discount.
--    unit_price_before_discount keeps the list price so ledgers stay coherent.

create table if not exists public.product_price_tiers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  min_quantity integer not null check (min_quantity >= 1),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, min_quantity)
);

create index if not exists product_price_tiers_product_idx
  on public.product_price_tiers(product_id, min_quantity);

alter table public.product_price_tiers enable row level security;

drop policy if exists "Approved users read price tiers" on public.product_price_tiers;
create policy "Approved users read price tiers"
on public.product_price_tiers for select
to authenticated
using (public.is_approved_customer() or public.is_staff_or_admin());

drop policy if exists "Admins manage price tiers" on public.product_price_tiers;
create policy "Admins manage price tiers"
on public.product_price_tiers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Total approved quantity for a customer in the Bangkok calendar month that
-- contains `at_month` (any timestamp inside the month, Bangkok local time).
create or replace function public.price_program_month_quantity(
  target_customer_id uuid,
  at_month timestamp
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(oi.quantity), 0)::integer
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.customer_id = target_customer_id
    and o.debt_applied_at is not null
    and o.status not in ('rejected', 'cancelled')
    and (o.debt_applied_at at time zone 'Asia/Bangkok') >= date_trunc('month', at_month)
    and (o.debt_applied_at at time zone 'Asia/Bangkok') < date_trunc('month', at_month) + interval '1 month'
$$;

revoke execute on function public.price_program_month_quantity(uuid, timestamp) from public, anon, authenticated;

-- Caller-facing status for the Price Program page.
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
begin
  if actor is null then
    return jsonb_build_object('floor_quantity', 0, 'month_quantity', 0);
  end if;

  return jsonb_build_object(
    'floor_quantity', public.price_program_month_quantity(actor, bkk_now - interval '1 month'),
    'month_quantity', public.price_program_month_quantity(actor, bkk_now)
  );
end;
$$;

grant execute on function public.price_program_status() to authenticated;

-- Re-create create_order with tier pricing (based on the current version).
create or replace function public.create_order(
  items jsonb,
  shipping_address_id uuid default null,
  customer_note text default null
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
  cust_floor integer := 0;
  item record;
  product_row record;
  current_qty integer;
  after_qty integer;
  address_row public.customer_addresses%rowtype;
  tier_unit_price numeric(12,2);
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

  select greatest(coalesce(per_item_discount, 0), 0)
    into customer_discount_per_unit
  from public.profiles
  where id = actor;

  -- Last month's approved quantity = this month's pricing floor ("ยศ").
  cust_floor := public.price_program_month_quantity(
    actor,
    (now() at time zone 'Asia/Bangkok') - interval '1 month'
  );

  if shipping_address_id is not null then
    select * into address_row
    from public.customer_addresses
    where id = shipping_address_id and customer_id = actor;

    if not found then
      raise exception 'Shipping address not found';
    end if;
  end if;

  insert into public.orders (
    id,
    order_number,
    customer_id,
    status,
    customer_note,
    shipping_address_id,
    shipping_snapshot
  )
  values (
    order_id,
    'ORD-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0'),
    actor,
    'pending_admin',
    nullif(customer_note, ''),
    shipping_address_id,
    case
      when shipping_address_id is null then null
      else to_jsonb(address_row)
    end
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

    -- Ladder price at the effective quantity (line quantity or monthly floor,
    -- whichever is higher). Falls back to the list price without a ladder.
    select t.unit_price
      into tier_unit_price
    from public.product_price_tiers t
    where t.product_id = item.product_id
      and t.min_quantity <= greatest(item.quantity, cust_floor)
    order by t.min_quantity desc
    limit 1;

    item_unit_price := greatest(
      coalesce(tier_unit_price, item_base_price) - customer_discount_per_unit,
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

grant execute on function public.create_order(jsonb, uuid, text) to authenticated;

-- Seed the Marbo9000 product + its price ladder (idempotent).
do $$
declare
  pid uuid;
begin
  select id into pid
  from public.products
  where sku = 'MARBO-9000' or name ilike '%marbo%9000%'
  limit 1;

  if pid is null then
    insert into public.products (sku, name, description, unit, price, is_active, sort_order)
    values (
      'MARBO-9000',
      'Marbo9000 แท้',
      'Marbo 9000 ของแท้ ราคาขึ้นอยู่กับจำนวนที่สั่งซื้อ — ยิ่งซื้อมาก ยิ่งได้ราคาดี',
      'ชิ้น',
      320,
      true,
      1
    )
    returning id into pid;

    insert into public.inventory (product_id, quantity_available, low_stock_threshold)
    values (pid, 1000, 50);

    insert into public.inventory_movements (product_id, type, quantity_delta, quantity_after, note)
    values (pid, 'initial', 1000, 1000, 'Initial stock (price program seed)');
  end if;

  insert into public.product_price_tiers (product_id, min_quantity, unit_price)
  values
    (pid, 1, 320),
    (pid, 5, 310),
    (pid, 10, 300),
    (pid, 20, 290),
    (pid, 30, 280),
    (pid, 50, 265),
    (pid, 100, 260),
    (pid, 150, 250),
    (pid, 500, 240),
    (pid, 1000, 235)
  on conflict (product_id, min_quantity) do update
  set unit_price = excluded.unit_price;
end;
$$;
