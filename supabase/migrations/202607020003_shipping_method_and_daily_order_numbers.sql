-- Order workflow v2:
-- 1. orders.shipping_method: customer picks Flash Express or Grab at checkout.
-- 2. Human-friendly daily order numbers: "NN-DDMMYY" (NN = n-th order of that
--    Bangkok day, e.g. 01-020726). Serialized with an advisory lock; the
--    unique constraint on order_number remains the backstop.
-- 3. ship_order_with_photo becomes the "packing done" step: Flash orders move
--    to ready_to_ship (new courier-handoff stage in the admin UI), Grab orders
--    go straight to shipping.

alter table public.orders
  add column if not exists shipping_method text not null default 'flash'
    check (shipping_method in ('flash', 'grab'));

-- Replace the 3-arg signature entirely: keeping both would make PostgREST
-- ambiguous for 3-arg calls. Old builds calling with 3 args still resolve to
-- this function via the shipping_method default.
drop function if exists public.create_order(jsonb, uuid, text);

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

-- Packing-done step: photo required; Flash → courier handoff stage, Grab → shipped.
create or replace function public.ship_order_with_photo(
  target_order_id uuid,
  storage_path text,
  caption text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  photo_id uuid;
  method text;
  next_status public.order_status;
begin
  if actor is null or not public.is_staff_or_admin() then
    raise exception 'Only staff can ship orders';
  end if;

  if nullif(storage_path, '') is null then
    raise exception 'Packed product photo is required before shipping';
  end if;

  select shipping_method into method
  from public.orders
  where id = target_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  next_status := case when method = 'grab' then 'shipping' else 'ready_to_ship' end;

  photo_id := public.upload_order_photo(target_order_id, storage_path, caption);
  perform public.update_order_status(
    target_order_id,
    next_status,
    coalesce(nullif(caption, ''), case when method = 'grab' then 'จัดส่งแล้ว (Grab)' else 'จัดสินค้าเสร็จ รอส่งขนส่ง' end)
  );

  return photo_id;
end;
$$;

grant execute on function public.ship_order_with_photo(uuid, text, text) to authenticated;
revoke execute on function public.ship_order_with_photo(uuid, text, text) from public, anon;
