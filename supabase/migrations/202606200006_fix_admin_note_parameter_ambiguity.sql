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
      admin_note = coalesce(nullif(note, ''), public.orders.admin_note)
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
      admin_note = nullif($2, ''),
      reviewed_at = now(),
      reviewed_by = actor
  where id = target_payment_id;

  insert into public.line_notification_outbox(event_type, customer_id, payment_id, payload)
  values ('payment_rejected', payment_row.customer_id, payment_row.id, jsonb_build_object('payment_id', payment_row.id));
end;
$$;

grant execute on function public.approve_order(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.approve_payment(uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
