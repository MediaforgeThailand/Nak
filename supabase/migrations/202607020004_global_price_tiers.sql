-- Price Program v3: ONE global discount ladder for every product.
--
-- Previously the ladder lived per product (product_price_tiers) so only
-- Marbo9000 had tier pricing. The business rule is: the discount applies to
-- every product and every piece. The tier is chosen from the TOTAL number of
-- pieces in the order (all products combined) or the customer's monthly floor,
-- whichever is higher, and that per-unit discount applies to every line.
--
-- product_price_tiers stays in place (unused) so the currently-deployed build
-- keeps working during rollout.

create table if not exists public.price_tiers (
  id uuid primary key default gen_random_uuid(),
  min_quantity integer not null unique check (min_quantity >= 1),
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);

alter table public.price_tiers enable row level security;

drop policy if exists "Approved users read global price tiers" on public.price_tiers;
create policy "Approved users read global price tiers"
on public.price_tiers for select
to authenticated
using (public.is_approved_customer() or public.is_staff_or_admin());

drop policy if exists "Admins manage global price tiers" on public.price_tiers;
create policy "Admins manage global price tiers"
on public.price_tiers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Seed the ladder from the spec (idempotent).
insert into public.price_tiers (min_quantity, discount_amount)
values (1, 0), (5, 10), (10, 20), (20, 30), (30, 40), (50, 55), (100, 60), (150, 70), (500, 80), (1000, 85)
on conflict (min_quantity) do update set discount_amount = excluded.discount_amount;

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

  -- Global ladder: tier from ALL pieces in this order (any product) or the
  -- monthly rank floor, whichever is greater; applies to every line.
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
    where id = shipping_address_id and customer_id = actor;

    if not found then
      raise exception 'Shipping address not found';
    end if;
  end if;

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

    select d.discount_amount
      into product_discount
    from public.customer_product_discounts d
    where d.customer_id = actor
      and d.product_id = item.product_id;

    item_unit_price := greatest(
      item_base_price
        - tier_discount
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
