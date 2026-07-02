-- Data-integrity fix: keep the account-transaction ledger consistent when a
-- payment exceeds the outstanding debt.
--
-- approve_payment / admin_record_manual_payment clamp the new balance with
-- greatest(0, debt - amount) but recorded account_transactions.amount as the
-- FULL -amount. On an overpayment the recorded amount no longer equals the
-- actual change in balance_after, breaking ledger reconciliation. We now record
-- the amount that was actually applied to the debt (before - after), matching
-- the pattern already used by owner_adjust_customer_debt. Normal (non-over)
-- payments are unaffected because applied_credit == amount there.

create or replace function public.approve_payment(target_payment_id uuid, admin_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  payment_row public.payments%rowtype;
  before_balance numeric(12,2);
  new_balance numeric(12,2);
  applied_credit numeric(12,2);
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

  select debt_balance into before_balance
  from public.profiles
  where id = payment_row.customer_id
  for update;

  new_balance := greatest(0, before_balance - payment_row.amount);
  applied_credit := before_balance - new_balance;

  update public.profiles
  set debt_balance = new_balance
  where id = payment_row.customer_id;

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
    -applied_credit,
    new_balance,
    payment_row.id,
    'Debt reduced when admin verified payment slip',
    actor
  );

  insert into public.line_notification_outbox(event_type, customer_id, payment_id, payload)
  values ('payment_approved', payment_row.customer_id, payment_row.id, jsonb_build_object('payment_id', payment_row.id));
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
  before_balance numeric(12,2);
  new_balance numeric(12,2);
  applied_credit numeric(12,2);
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

  select debt_balance into before_balance
  from public.profiles
  where id = target_customer_id
  for update;

  new_balance := greatest(0, before_balance - amount);
  applied_credit := before_balance - new_balance;

  update public.profiles
  set debt_balance = new_balance
  where id = target_customer_id;

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
    -applied_credit,
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

grant execute on function public.approve_payment(uuid, text) to authenticated;
grant execute on function public.admin_record_manual_payment(uuid, numeric, text, date, text) to authenticated;
