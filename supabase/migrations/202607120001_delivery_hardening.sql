-- Delivery hardening (pre-handover audit fixes):
-- 1. Close the signup_scope self-escalation hole: a customer could mark their
--    own profile as a "staff request" via a direct PostgREST update. The
--    privilege-escalation trigger now pins signup_scope for non-admins; the
--    one legitimate self-service path (logging in on the backend entrance)
--    goes through the new request_staff_access() RPC instead.
-- 2. Post-approval order cancellation: cancel_approved_order() restores the
--    reserved stock, reverses the applied debt (clamped, ledger-consistent),
--    and moves the order to the previously-unreachable 'cancelled' status.
-- 3. Atomic global price ladder replacement: replace_price_tiers() swaps the
--    ladder in one transaction (the old delete-then-insert from the server
--    action could leave the ladder empty if the insert failed).
-- 4. submit_payment now verifies the slip path lives in the caller's own
--    payment-slips folder, so a payment row can't point at another
--    customer's slip.
-- 5. customer_addresses: factory_staff could DELETE any customer's address
--    (FOR ALL policy USING clause governs deletes). Split into per-command
--    policies: staff keep read-only, writes stay owner-or-admin.
-- 6. owner_set_owner_flag(): the owner can hand owner rights to another
--    approved admin from the app (previously is_owner existed only on the
--    seeded demo account and could not be granted without hand-written SQL).

-- ── 1a. handle_new_user: allow its on-conflict profile update to pass the
--        hardened trigger (service-role inserts have auth.uid() = null and
--        would otherwise get signup_scope silently pinned).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_scope text := case
    when new.raw_user_meta_data->>'account_scope' = 'staff' then 'staff'
    else 'customer'
  end;
begin
  perform set_config('app.allow_profile_account_mutation', 'on', true);

  insert into public.profiles (
    id,
    email,
    full_name,
    company_name,
    phone,
    role,
    status,
    signup_scope
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer',
    'pending',
    requested_scope
  )
  on conflict (id) do update
  set signup_scope = excluded.signup_scope
  where public.profiles.status = 'pending';

  return new;
end;
$$;

-- ── 1b. Pin signup_scope for non-admin direct writes.
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
    return new;
  end if;

  new.role = old.role;
  new.status = old.status;
  new.signup_scope = old.signup_scope;
  new.debt_balance = old.debt_balance;
  new.per_item_discount = old.per_item_discount;
  new.locked_floor_quantity = old.locked_floor_quantity;
  new.is_owner = old.is_owner;
  new.approved_at = old.approved_at;
  new.approved_by = old.approved_by;
  return new;
end;
$$;

-- ── 1c. Explicit self-service staff request (used by the backend login flow).
create or replace function public.request_staff_access()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set signup_scope = 'staff'
  where id = actor
    and role = 'customer';

  if not found then
    raise exception 'Only customer accounts can request staff access';
  end if;
end;
$$;

grant execute on function public.request_staff_access() to authenticated;
revoke execute on function public.request_staff_access() from public, anon;

-- Companion: withdraw a staff request (pending-form save on the customer
-- side used to reset signup_scope directly; the trigger now blocks that).
create or replace function public.revoke_staff_request()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Not authenticated';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set signup_scope = 'customer'
  where id = actor
    and role = 'customer';

  if not found then
    raise exception 'Only customer accounts can withdraw a staff request';
  end if;
end;
$$;

grant execute on function public.revoke_staff_request() to authenticated;
revoke execute on function public.revoke_staff_request() from public, anon;

-- ── 2. Cancel an approved (not yet shipped) order ──────────────────────────
alter type public.inventory_movement_type add value if not exists 'order_cancelled_restore';

alter table public.orders
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.profiles(id),
  add column if not exists cancellation_reason text;

create or replace function public.cancel_approved_order(
  target_order_id uuid,
  reason text
)
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
  old_balance numeric(12,2);
  new_balance numeric(12,2);
  reversed numeric(12,2);
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can cancel orders';
  end if;

  if nullif(btrim(coalesce(reason, '')), '') is null then
    raise exception 'Cancellation reason is required';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_row.status not in ('approved', 'packing', 'ready_to_ship') then
    raise exception 'Only approved orders that have not shipped can be cancelled';
  end if;

  -- Restore the stock reserved at create_order, with audit rows.
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
      'order_cancelled_restore',
      item.quantity,
      after_qty,
      order_row.id,
      'Stock restored when admin cancelled order',
      actor
    );
  end loop;

  -- Reverse the debt applied at approval. Clamp at zero and record the
  -- ACTUAL signed delta (negative = debt decrease), matching the ledger
  -- convention of approve_payment / owner_adjust_customer_debt.
  perform set_config('app.allow_profile_account_mutation', 'on', true);

  select debt_balance into old_balance
  from public.profiles
  where id = order_row.customer_id
  for update;

  update public.profiles
  set debt_balance = greatest(0, debt_balance - order_row.subtotal)
  where id = order_row.customer_id
  returning debt_balance into new_balance;

  reversed := new_balance - old_balance;

  update public.orders
  set status = 'cancelled',
      cancelled_at = now(),
      cancelled_by = actor,
      cancellation_reason = btrim(reason)
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
    'order_reversal',
    reversed,
    new_balance,
    order_row.id,
    'Debt reversed when admin cancelled order',
    actor
  );

  insert into public.line_notification_outbox(event_type, customer_id, order_id, payload)
  values (
    'order_cancelled',
    order_row.customer_id,
    order_row.id,
    jsonb_build_object('order_id', order_row.id, 'reason', btrim(reason))
  );
end;
$$;

grant execute on function public.cancel_approved_order(uuid, text) to authenticated;
revoke execute on function public.cancel_approved_order(uuid, text) from public, anon;

-- ── 3. Atomic replacement of the global price ladder ───────────────────────
create or replace function public.replace_price_tiers(tiers jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  tier record;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can update price tiers';
  end if;

  if tiers is null or jsonb_typeof(tiers) <> 'array' or jsonb_array_length(tiers) = 0 then
    raise exception 'At least one price tier is required';
  end if;

  for tier in
    select
      (value->>'min_quantity')::integer as min_quantity,
      (value->>'discount_amount')::numeric as discount_amount
    from jsonb_array_elements(tiers)
  loop
    if tier.min_quantity is null or tier.min_quantity < 1 then
      raise exception 'Tier minimum quantity must be at least 1';
    end if;
    if tier.discount_amount is null or tier.discount_amount < 0 then
      raise exception 'Tier discount must be zero or greater';
    end if;
  end loop;

  -- Function body runs in one transaction: if the insert fails the delete
  -- rolls back too, so the ladder can never be left empty.
  delete from public.price_tiers;

  insert into public.price_tiers (min_quantity, discount_amount)
  select distinct on ((value->>'min_quantity')::integer)
    (value->>'min_quantity')::integer,
    (value->>'discount_amount')::numeric
  from jsonb_array_elements(tiers);
end;
$$;

grant execute on function public.replace_price_tiers(jsonb) to authenticated;
revoke execute on function public.replace_price_tiers(jsonb) from public, anon;

-- ── 4. submit_payment: slip must live in the caller's own folder ───────────
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

  -- Uploads go to payment-slips/<uid>/... — reject paths outside the
  -- caller's folder so a payment can't reference someone else's slip.
  if position(actor::text || '/' in slip_path) <> 1 then
    raise exception 'Payment slip path is invalid';
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

-- ── 5. customer_addresses: per-command policies ─────────────────────────────
drop policy if exists "Customers manage own addresses" on public.customer_addresses;

create policy "Own or staff read addresses"
on public.customer_addresses for select
to authenticated
using (customer_id = auth.uid() or public.is_staff_or_admin());

create policy "Own or admin insert addresses"
on public.customer_addresses for insert
to authenticated
with check (customer_id = auth.uid() or public.is_admin());

create policy "Own or admin update addresses"
on public.customer_addresses for update
to authenticated
using (customer_id = auth.uid() or public.is_admin())
with check (customer_id = auth.uid() or public.is_admin());

create policy "Own or admin delete addresses"
on public.customer_addresses for delete
to authenticated
using (customer_id = auth.uid() or public.is_admin());

-- ── 6. Owner can grant/revoke owner rights from the app ────────────────────
create or replace function public.owner_set_owner_flag(
  target_user_id uuid,
  make_owner boolean
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
    raise exception 'Only the owner can change owner rights';
  end if;

  if target_user_id = actor and not make_owner then
    raise exception 'Cannot remove your own owner rights';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.profiles
  set is_owner = make_owner
  where id = target_user_id
    and role = 'admin'
    and status = 'approved';

  if not found then
    raise exception 'Target must be an approved admin account';
  end if;
end;
$$;

grant execute on function public.owner_set_owner_flag(uuid, boolean) to authenticated;
revoke execute on function public.owner_set_owner_flag(uuid, boolean) from public, anon;

-- ── 7. Real payment details (bank transfer) ─────────────────────────────────
-- The shop takes plain bank transfers (no QR, per the owner): admin configures
-- bank name + account number + account name in app_settings (key
-- 'payment_bank_account'); the customer payment page shows them with the bank
-- logo. Customers may read ONLY this key — everything else stays staff-only.
create policy "Approved customers read payment settings"
on public.app_settings for select
to authenticated
using (key = 'payment_bank_account' and public.is_approved_customer());

-- Seed the shop's real receiving account (provided by the owner) so the
-- payment page works right after deploy; editable later in /admin/settings.
insert into public.app_settings (key, value, description)
values (
  'payment_bank_account',
  jsonb_build_object(
    'bank', 'ธนาคารกรุงไทย',
    'account_number', '663-6-81505-1',
    'account_name', 'ภควัฒน์'
  ),
  'Bank account shown on the customer payment page'
)
on conflict (key) do nothing;

-- Remove stale placeholder rows from the initial seed: 'line_oa' described a
-- stubbed integration that now really exists (scheduled flex reports), and
-- 'ordering' flags were never read by any code.
delete from public.app_settings where key in ('line_oa', 'ordering');
