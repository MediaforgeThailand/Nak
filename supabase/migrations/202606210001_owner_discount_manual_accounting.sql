alter table public.profiles
  add column if not exists is_owner boolean not null default false,
  add column if not exists per_item_discount numeric(12,2) not null default 0 check (per_item_discount >= 0);

update public.profiles
set is_owner = true
where email = 'admin@admin.com';

alter table public.orders
  add column if not exists total_before_discount numeric(12,2) not null default 0 check (total_before_discount >= 0),
  add column if not exists total_discount numeric(12,2) not null default 0 check (total_discount >= 0);

update public.orders
set total_before_discount = subtotal
where total_before_discount = 0 and subtotal > 0;

alter table public.order_items
  add column if not exists unit_price_before_discount numeric(12,2) not null default 0 check (unit_price_before_discount >= 0),
  add column if not exists discount_per_unit numeric(12,2) not null default 0 check (discount_per_unit >= 0),
  add column if not exists line_discount_total numeric(12,2) not null default 0 check (line_discount_total >= 0);

update public.order_items
set unit_price_before_discount = unit_price
where unit_price_before_discount = 0 and unit_price > 0;

alter table public.payments
  alter column slip_path drop not null,
  add column if not exists source text not null default 'customer_submitted';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'payments_source_check'
      and conrelid = 'public.payments'::regclass
  ) then
    alter table public.payments
      add constraint payments_source_check
      check (source in ('customer_submitted', 'admin_manual'));
  end if;
end;
$$;

create or replace function public.is_owner()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'approved'
      and is_owner = true
  )
$$;

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
    new.debt_balance = old.debt_balance;
    return new;
  end if;

  new.role = old.role;
  new.status = old.status;
  new.debt_balance = old.debt_balance;
  new.per_item_discount = old.per_item_discount;
  new.is_owner = old.is_owner;
  new.approved_at = old.approved_at;
  new.approved_by = old.approved_by;
  return new;
end;
$$;

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
  item record;
  product_row record;
  current_qty integer;
  after_qty integer;
  address_row public.customer_addresses%rowtype;
  item_discount_per_unit numeric(12,2);
  item_unit_price numeric(12,2);
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

    item_discount_per_unit := least(customer_discount_per_unit, product_row.price);
    item_unit_price := greatest(product_row.price - item_discount_per_unit, 0);
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
      product_row.price,
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
    order_total_before_discount := order_total_before_discount + (product_row.price * item.quantity);
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

create or replace function public.approve_order(target_order_id uuid, admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_row public.orders%rowtype;
  new_balance numeric(12,2);
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can approve orders';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_row.status <> 'pending_admin' then
    raise exception 'Only pending orders can be approved';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set debt_balance = debt_balance + order_row.subtotal
  where id = order_row.customer_id
  returning debt_balance into new_balance;

  update public.orders
  set status = 'approved',
      admin_note = nullif($2, ''),
      approved_at = now(),
      approved_by = actor,
      debt_applied_at = now()
  where id = target_order_id;

  insert into public.account_transactions (
    customer_id,
    type,
    amount,
    balance_after,
    order_id,
    note,
    created_by
  )
  values (
    order_row.customer_id,
    'order_debt',
    order_row.subtotal,
    new_balance,
    order_row.id,
    'Debt increased when admin approved order',
    actor
  );

  insert into public.line_notification_outbox(event_type, customer_id, order_id, payload)
  values ('order_approved', order_row.customer_id, order_row.id, jsonb_build_object('order_id', order_row.id));
end;
$$;

create or replace function public.approve_payment(target_payment_id uuid, admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  payment_row public.payments%rowtype;
  new_balance numeric(12,2);
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can approve payments';
  end if;

  select * into payment_row
  from public.payments
  where id = target_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if payment_row.status <> 'pending' then
    raise exception 'Only pending payments can be approved';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set debt_balance = greatest(0, debt_balance - payment_row.amount)
  where id = payment_row.customer_id
  returning debt_balance into new_balance;

  update public.payments
  set status = 'approved',
      admin_note = nullif($2, ''),
      reviewed_at = now(),
      reviewed_by = actor
  where id = target_payment_id;

  insert into public.account_transactions (
    customer_id,
    type,
    amount,
    balance_after,
    payment_id,
    note,
    created_by
  )
  values (
    payment_row.customer_id,
    'payment_credit',
    -payment_row.amount,
    new_balance,
    payment_row.id,
    'Debt reduced when admin verified payment slip',
    actor
  );

  insert into public.line_notification_outbox(event_type, customer_id, payment_id, payload)
  values ('payment_approved', payment_row.customer_id, payment_row.id, jsonb_build_object('payment_id', payment_row.id));
end;
$$;

create or replace function public.owner_update_customer_discount(
  target_customer_id uuid,
  discount_per_item numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.is_owner() then
    raise exception 'Only owners can update customer discounts';
  end if;

  if discount_per_item is null or discount_per_item < 0 then
    raise exception 'Discount must be zero or greater';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set per_item_discount = discount_per_item
  where id = target_customer_id
    and role = 'customer';

  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

create or replace function public.owner_adjust_customer_debt(
  target_customer_id uuid,
  amount_delta numeric,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  before_balance numeric(12,2);
  after_balance numeric(12,2);
  actual_delta numeric(12,2);
begin
  if actor is null or not public.is_owner() then
    raise exception 'Only owners can adjust customer debt';
  end if;

  if amount_delta is null or amount_delta = 0 then
    raise exception 'Adjustment amount cannot be zero';
  end if;

  select debt_balance
    into before_balance
  from public.profiles
  where id = target_customer_id
    and role = 'customer'
  for update;

  if not found then
    raise exception 'Customer not found';
  end if;

  after_balance := greatest(0, before_balance + amount_delta);
  actual_delta := after_balance - before_balance;

  if actual_delta = 0 then
    raise exception 'Adjustment does not change the customer balance';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set debt_balance = after_balance
  where id = target_customer_id;

  insert into public.account_transactions (
    customer_id,
    type,
    amount,
    balance_after,
    note,
    created_by
  )
  values (
    target_customer_id,
    'manual_adjustment',
    actual_delta,
    after_balance,
    coalesce(nullif(note, ''), 'Owner manual debt adjustment'),
    actor
  );
end;
$$;

create or replace function public.admin_record_manual_payment(
  target_customer_id uuid,
  amount numeric,
  slip_path text default null,
  transfer_date date default null,
  admin_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  payment_id uuid := gen_random_uuid();
  new_balance numeric(12,2);
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can record manual payments';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = target_customer_id
      and role = 'customer'
      and status = 'approved'
  ) then
    raise exception 'Approved customer not found';
  end if;

  insert into public.payments (
    id,
    payment_number,
    customer_id,
    amount,
    transfer_date,
    slip_path,
    status,
    source,
    admin_note,
    reviewed_at,
    reviewed_by
  )
  values (
    payment_id,
    'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.payment_number_seq')::text, 6, '0'),
    target_customer_id,
    amount,
    transfer_date,
    nullif(slip_path, ''),
    'approved',
    'admin_manual',
    nullif(admin_note, ''),
    now(),
    actor
  );

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set debt_balance = greatest(0, debt_balance - amount)
  where id = target_customer_id
  returning debt_balance into new_balance;

  insert into public.account_transactions (
    customer_id,
    type,
    amount,
    balance_after,
    payment_id,
    note,
    created_by
  )
  values (
    target_customer_id,
    'payment_credit',
    -amount,
    new_balance,
    payment_id,
    coalesce(nullif(admin_note, ''), 'Admin manually recorded payment'),
    actor
  );

  insert into public.line_notification_outbox(event_type, customer_id, payment_id, payload)
  values ('payment_approved', target_customer_id, payment_id, jsonb_build_object('payment_id', payment_id, 'source', 'admin_manual'));

  return payment_id;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins upload payment slips'
  ) then
    create policy "Admins upload payment slips"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'payment-slips' and public.is_admin());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins delete payment slips'
  ) then
    create policy "Admins delete payment slips"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'payment-slips' and public.is_admin());
  end if;
end;
$$;

grant execute on function public.is_owner() to authenticated;
grant execute on function public.owner_update_customer_discount(uuid, numeric) to authenticated;
grant execute on function public.owner_adjust_customer_debt(uuid, numeric, text) to authenticated;
grant execute on function public.admin_record_manual_payment(uuid, numeric, text, date, text) to authenticated;
