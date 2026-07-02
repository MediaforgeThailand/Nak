-- Price Program v2:
-- 1. Tiers become DISCOUNTS from the product's base price (ราคากลาง) instead of
--    absolute prices, so admins can raise the base price when costs go up
--    without touching the discount ladder. (unit_price is kept in place, now
--    legacy, so the previous deployed build keeps working during rollout.)
-- 2. customer_product_discounts: per-customer, per-product special discount an
--    admin can grant, stacked on top of the tier + personal discounts.
-- 3. create_order prices a line as:
--    max(base - tier_discount(max(qty, monthly floor)) - product_discount
--        - personal per-item discount, 0)

alter table public.product_price_tiers
  add column if not exists discount_amount numeric(12,2) not null default 0
    check (discount_amount >= 0);

-- Backfill from the current absolute prices: discount = base - tier price.
update public.product_price_tiers t
set discount_amount = greatest(p.price - t.unit_price, 0)
from public.products p
where p.id = t.product_id
  and t.discount_amount = 0
  and t.unit_price > 0;

-- Per-customer, per-product special discount (admin managed).
create table if not exists public.customer_product_discounts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, product_id)
);

create index if not exists customer_product_discounts_product_idx
  on public.customer_product_discounts(product_id);

drop trigger if exists customer_product_discounts_touch_updated_at on public.customer_product_discounts;
create trigger customer_product_discounts_touch_updated_at
before update on public.customer_product_discounts
for each row execute function public.touch_updated_at();

alter table public.customer_product_discounts enable row level security;

drop policy if exists "Customers read own product discounts" on public.customer_product_discounts;
create policy "Customers read own product discounts"
on public.customer_product_discounts for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

drop policy if exists "Admins manage product discounts" on public.customer_product_discounts;
create policy "Admins manage product discounts"
on public.customer_product_discounts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Re-create create_order pricing from discounts.
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

  select greatest(coalesce(per_item_discount, 0), 0)
    into customer_discount_per_unit
  from public.profiles
  where id = actor;

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

grant execute on function public.create_order(jsonb, uuid, text) to authenticated;
