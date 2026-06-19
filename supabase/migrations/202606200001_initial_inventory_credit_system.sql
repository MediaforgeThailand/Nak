create extension if not exists pgcrypto;

create type public.user_role as enum ('customer', 'factory_staff', 'admin');
create type public.account_status as enum ('pending', 'approved', 'suspended');
create type public.order_status as enum (
  'pending_admin',
  'approved',
  'packing',
  'ready_to_ship',
  'shipping',
  'delivered',
  'rejected',
  'cancelled'
);
create type public.payment_status as enum ('pending', 'approved', 'rejected');
create type public.transaction_type as enum (
  'order_debt',
  'payment_credit',
  'manual_adjustment',
  'order_reversal'
);
create type public.inventory_movement_type as enum (
  'initial',
  'order_reserved',
  'order_rejected_restore',
  'manual_adjustment',
  'restock'
);
create type public.notification_status as enum ('queued', 'sent', 'failed', 'skipped');

create sequence if not exists public.order_number_seq;
create sequence if not exists public.payment_number_seq;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  phone text,
  line_user_id text,
  role public.user_role not null default 'customer',
  status public.account_status not null default 'pending',
  debt_balance numeric(12,2) not null default 0 check (debt_balance >= 0),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Main address',
  recipient_name text not null,
  phone text,
  address_line1 text not null,
  address_line2 text,
  district text,
  province text,
  postal_code text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  sku text not null unique,
  name text not null,
  description text,
  unit text not null default 'piece',
  price numeric(12,2) not null check (price >= 0),
  image_path text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity_available integer not null default 0 check (quantity_available >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending_admin',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  customer_note text,
  admin_note text,
  shipping_address_id uuid references public.customer_addresses(id) on delete set null,
  shipping_snapshot jsonb,
  debt_applied_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  rejected_at timestamptz,
  rejected_by uuid references public.profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  sku text not null,
  unit text not null,
  unit_price numeric(12,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create table public.order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  transfer_date date,
  slip_path text not null,
  status public.payment_status not null default 'pending',
  customer_note text,
  admin_note text,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  type public.transaction_type not null,
  amount numeric(12,2) not null,
  balance_after numeric(12,2) not null check (balance_after >= 0),
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  type public.inventory_movement_type not null,
  quantity_delta integer not null,
  quantity_after integer not null check (quantity_after >= 0),
  order_id uuid references public.orders(id) on delete set null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.user_role not null,
  permission text not null,
  enabled boolean not null default true,
  unique (role, permission)
);

create table public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.line_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  customer_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status public.notification_status not null default 'queued',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index profiles_role_status_idx on public.profiles(role, status);
create index customer_addresses_customer_idx on public.customer_addresses(customer_id);
create index products_active_sort_idx on public.products(is_active, sort_order, name);
create index orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index orders_status_created_idx on public.orders(status, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index payments_customer_created_idx on public.payments(customer_id, created_at desc);
create index payments_status_created_idx on public.payments(status, created_at desc);
create index account_transactions_customer_created_idx on public.account_transactions(customer_id, created_at desc);
create index inventory_movements_product_created_idx on public.inventory_movements(product_id, created_at desc);
create index line_outbox_status_created_idx on public.line_notification_outbox(status, created_at);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger customer_addresses_touch_updated_at
before update on public.customer_addresses
for each row execute function public.touch_updated_at();

create trigger products_touch_updated_at
before update on public.products
for each row execute function public.touch_updated_at();

create trigger inventory_touch_updated_at
before update on public.inventory
for each row execute function public.touch_updated_at();

create trigger orders_touch_updated_at
before update on public.orders
for each row execute function public.touch_updated_at();

create trigger payments_touch_updated_at
before update on public.payments
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    company_name,
    phone,
    role,
    status
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer',
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_profile()
returns public.profiles
language sql
security definer
stable
set search_path = public
as $$
  select *
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.has_role(target_roles public.user_role[])
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
      and role = any(target_roles)
      and status = 'approved'
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_role(array['admin']::public.user_role[])
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.has_role(array['admin','factory_staff']::public.user_role[])
$$;

create or replace function public.is_approved_customer()
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
      and role = 'customer'
      and status = 'approved'
  )
$$;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  new.role = old.role;
  new.status = old.status;
  new.debt_balance = old.debt_balance;
  new.approved_at = old.approved_at;
  new.approved_by = old.approved_by;
  return new;
end;
$$;

create trigger profiles_prevent_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

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
  item record;
  product_row record;
  current_qty integer;
  after_qty integer;
  address_row public.customer_addresses%rowtype;
begin
  if actor is null or not public.is_approved_customer() then
    raise exception 'Only approved customers can create orders';
  end if;

  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then
    raise exception 'Order items are required';
  end if;

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
      quantity,
      line_total
    )
    values (
      order_id,
      product_row.id,
      product_row.name,
      product_row.sku,
      product_row.unit,
      product_row.price,
      item.quantity,
      product_row.price * item.quantity
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

    order_total := order_total + (product_row.price * item.quantity);
  end loop;

  update public.orders
  set subtotal = order_total
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

  update public.profiles
  set debt_balance = debt_balance + order_row.subtotal
  where id = order_row.customer_id
  returning debt_balance into new_balance;

  update public.orders
  set status = 'approved',
      admin_note = nullif(admin_note, ''),
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

create or replace function public.reject_order(target_order_id uuid, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_row public.orders%rowtype;
  item record;
  after_qty integer;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can reject orders';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_row.status <> 'pending_admin' then
    raise exception 'Only pending orders can be rejected';
  end if;

  for item in
    select product_id, quantity
    from public.order_items
    where order_id = target_order_id
    order by product_id
  loop
    update public.inventory
    set quantity_available = quantity_available + item.quantity
    where product_id = item.product_id
    returning quantity_available into after_qty;

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
      'order_rejected_restore',
      item.quantity,
      after_qty,
      order_row.id,
      'Stock restored when admin rejected order',
      actor
    );
  end loop;

  update public.orders
  set status = 'rejected',
      rejected_at = now(),
      rejected_by = actor,
      rejection_reason = nullif(reason, '')
  where id = target_order_id;

  insert into public.line_notification_outbox(event_type, customer_id, order_id, payload)
  values ('order_rejected', order_row.customer_id, order_row.id, jsonb_build_object('order_id', order_row.id, 'reason', reason));
end;
$$;

create or replace function public.update_order_status(
  target_order_id uuid,
  new_status public.order_status,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_row public.orders%rowtype;
begin
  if actor is null or not public.is_staff_or_admin() then
    raise exception 'Only staff can update order status';
  end if;

  if new_status in ('pending_admin', 'rejected', 'cancelled') then
    raise exception 'Use approval or rejection flows for this status';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_row.status in ('pending_admin', 'rejected', 'cancelled', 'delivered') then
    raise exception 'Order status cannot be changed from current state';
  end if;

  if new_status = 'shipping' and not exists (
    select 1 from public.order_photos where order_id = target_order_id
  ) then
    raise exception 'Packed product photo is required before shipping';
  end if;

  update public.orders
  set status = new_status,
      admin_note = coalesce(nullif(note, ''), admin_note)
  where id = target_order_id;

  insert into public.line_notification_outbox(event_type, customer_id, order_id, payload)
  values (
    'order_status_changed',
    order_row.customer_id,
    order_row.id,
    jsonb_build_object('order_id', order_row.id, 'status', new_status)
  );
end;
$$;

create or replace function public.upload_order_photo(
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
begin
  if actor is null or not public.is_staff_or_admin() then
    raise exception 'Only staff can upload packed order photos';
  end if;

  if not exists (
    select 1
    from public.orders
    where id = target_order_id
      and status in ('approved', 'packing', 'ready_to_ship')
  ) then
    raise exception 'Order is not ready for packing photos';
  end if;

  insert into public.order_photos(order_id, uploaded_by, storage_path, caption)
  values (target_order_id, actor, storage_path, nullif(caption, ''))
  returning id into photo_id;

  return photo_id;
end;
$$;

create or replace function public.submit_payment(
  amount numeric,
  slip_path text,
  transfer_date date default null,
  customer_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  payment_id uuid := gen_random_uuid();
begin
  if actor is null or not public.is_approved_customer() then
    raise exception 'Only approved customers can submit payments';
  end if;

  if amount is null or amount <= 0 then
    raise exception 'Payment amount must be greater than zero';
  end if;

  if nullif(slip_path, '') is null then
    raise exception 'Payment slip is required';
  end if;

  insert into public.payments (
    id,
    payment_number,
    customer_id,
    amount,
    transfer_date,
    slip_path,
    status,
    customer_note
  )
  values (
    payment_id,
    'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.payment_number_seq')::text, 6, '0'),
    actor,
    amount,
    transfer_date,
    slip_path,
    'pending',
    nullif(customer_note, '')
  );

  insert into public.line_notification_outbox(event_type, customer_id, payment_id, payload)
  values ('payment_submitted', actor, payment_id, jsonb_build_object('payment_id', payment_id));

  return payment_id;
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

  update public.profiles
  set debt_balance = greatest(0, debt_balance - payment_row.amount)
  where id = payment_row.customer_id
  returning debt_balance into new_balance;

  update public.payments
  set status = 'approved',
      admin_note = nullif(admin_note, ''),
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

create or replace function public.reject_payment(target_payment_id uuid, admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  payment_row public.payments%rowtype;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can reject payments';
  end if;

  select * into payment_row
  from public.payments
  where id = target_payment_id
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if payment_row.status <> 'pending' then
    raise exception 'Only pending payments can be rejected';
  end if;

  update public.payments
  set status = 'rejected',
      admin_note = nullif(admin_note, ''),
      reviewed_at = now(),
      reviewed_by = actor
  where id = target_payment_id;

  insert into public.line_notification_outbox(event_type, customer_id, payment_id, payload)
  values ('payment_rejected', payment_row.customer_id, payment_row.id, jsonb_build_object('payment_id', payment_row.id));
end;
$$;

create or replace function public.adjust_inventory(
  target_product_id uuid,
  quantity_delta integer,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  before_qty integer;
  after_qty integer;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can adjust inventory';
  end if;

  if quantity_delta = 0 then
    raise exception 'Adjustment quantity cannot be zero';
  end if;

  select quantity_available
    into before_qty
  from public.inventory
  where product_id = target_product_id
  for update;

  if not found then
    raise exception 'Inventory record missing';
  end if;

  after_qty := before_qty + quantity_delta;

  if after_qty < 0 then
    raise exception 'Inventory cannot become negative';
  end if;

  update public.inventory
  set quantity_available = after_qty
  where product_id = target_product_id;

  insert into public.inventory_movements (
    product_id,
    type,
    quantity_delta,
    quantity_after,
    note,
    created_by
  )
  values (
    target_product_id,
    case when quantity_delta > 0 then 'restock' else 'manual_adjustment' end,
    quantity_delta,
    after_qty,
    nullif(note, ''),
    actor
  );
end;
$$;

create or replace function public.approve_customer(
  target_user_id uuid,
  target_role public.user_role default 'customer'
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
    raise exception 'Only admins can approve users';
  end if;

  update public.profiles
  set status = 'approved',
      role = target_role,
      approved_at = now(),
      approved_by = actor
  where id = target_user_id;
end;
$$;

create or replace function public.suspend_customer(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can suspend users';
  end if;

  update public.profiles
  set status = 'suspended'
  where id = target_user_id;
end;
$$;

create or replace function public.create_product_with_inventory(
  sku text,
  name text,
  price numeric,
  unit text default 'piece',
  quantity_available integer default 0,
  low_stock_threshold integer default 5,
  description text default null,
  category_id uuid default null,
  image_path text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  product_id uuid;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can create products';
  end if;

  insert into public.products(sku, name, price, unit, description, category_id, image_path)
  values (sku, name, price, coalesce(nullif(unit, ''), 'piece'), nullif(description, ''), category_id, nullif(image_path, ''))
  returning id into product_id;

  insert into public.inventory(product_id, quantity_available, low_stock_threshold)
  values (product_id, greatest(0, quantity_available), greatest(0, low_stock_threshold));

  insert into public.inventory_movements(product_id, type, quantity_delta, quantity_after, note, created_by)
  values (product_id, 'initial', greatest(0, quantity_available), greatest(0, quantity_available), 'Initial product stock', actor);

  return product_id;
end;
$$;

grant execute on function public.create_order(jsonb, uuid, text) to authenticated;
grant execute on function public.approve_order(uuid, text) to authenticated;
grant execute on function public.reject_order(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.upload_order_photo(uuid, text, text) to authenticated;
grant execute on function public.submit_payment(numeric, text, date, text) to authenticated;
grant execute on function public.approve_payment(uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
grant execute on function public.approve_customer(uuid, public.user_role) to authenticated;
grant execute on function public.suspend_customer(uuid) to authenticated;
grant execute on function public.create_product_with_inventory(text, text, numeric, text, integer, integer, text, uuid, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_photos enable row level security;
alter table public.payments enable row level security;
alter table public.account_transactions enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.role_permissions enable row level security;
alter table public.app_settings enable row level security;
alter table public.line_notification_outbox enable row level security;

create policy "Profiles can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_staff_or_admin());

create policy "Profiles can update own safe fields"
on public.profiles for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "Customers manage own addresses"
on public.customer_addresses for all
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin())
with check (customer_id = auth.uid() or public.is_admin());

create policy "Approved users read categories"
on public.product_categories for select
to authenticated
using (public.is_approved_customer() or public.is_staff_or_admin());

create policy "Admins manage categories"
on public.product_categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Approved users read active products"
on public.products for select
to authenticated
using ((is_active = true and public.is_approved_customer()) or public.is_staff_or_admin());

create policy "Admins manage products"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Approved users read inventory"
on public.inventory for select
to authenticated
using (public.is_approved_customer() or public.is_staff_or_admin());

create policy "Admins manage inventory"
on public.inventory for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Customers and staff read orders"
on public.orders for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

create policy "Customers and staff read order items"
on public.order_items for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (o.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

create policy "Customers and staff read order photos"
on public.order_photos for select
to authenticated
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_photos.order_id
      and (o.customer_id = auth.uid() or public.is_staff_or_admin())
  )
);

create policy "Customers and staff read payments"
on public.payments for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

create policy "Customers and staff read transactions"
on public.account_transactions for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

create policy "Staff read inventory movements"
on public.inventory_movements for select
to authenticated
using (public.is_staff_or_admin());

create policy "Admins manage role permissions"
on public.role_permissions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins manage app settings"
on public.app_settings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Staff read settings"
on public.app_settings for select
to authenticated
using (public.is_staff_or_admin());

create policy "Admins read notification outbox"
on public.line_notification_outbox for select
to authenticated
using (public.is_admin());

insert into public.role_permissions(role, permission, enabled)
values
  ('admin', 'manage_products', true),
  ('admin', 'manage_stock', true),
  ('admin', 'manage_orders', true),
  ('admin', 'verify_payments', true),
  ('admin', 'manage_customers', true),
  ('admin', 'manage_permissions', true),
  ('admin', 'manage_settings', true),
  ('factory_staff', 'upload_order_photos', true),
  ('factory_staff', 'update_order_status', true),
  ('customer', 'place_orders', true),
  ('customer', 'submit_payments', true)
on conflict (role, permission) do update set enabled = excluded.enabled;

insert into public.app_settings(key, value, description)
values
  ('line_oa', '{"enabled": false, "mode": "stub"}', 'LINE OA notification integration placeholder for future MVP phase'),
  ('ordering', '{"allow_customer_checkout": true, "stock_deducts_on_submit": true}', 'Ordering behavior flags')
on conflict (key) do update set value = excluded.value, description = excluded.description;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('order-photos', 'order-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-slips', 'payment-slips', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Approved users read product images"
on storage.objects for select
to authenticated
using (bucket_id = 'product-images' and (public.is_approved_customer() or public.is_staff_or_admin()));

create policy "Admins manage product images"
on storage.objects for all
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create policy "Customers and staff read payment slips"
on storage.objects for select
to authenticated
using (
  bucket_id = 'payment-slips'
  and (
    public.is_staff_or_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "Approved customers upload own payment slips"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-slips'
  and public.is_approved_customer()
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Customers and staff read order photos"
on storage.objects for select
to authenticated
using (bucket_id = 'order-photos' and (public.is_approved_customer() or public.is_staff_or_admin()));

create policy "Staff upload order photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'order-photos' and public.is_staff_or_admin());
