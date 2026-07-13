-- Permanent account deletion (2026-07-14).
--
-- Adds delete_user(uuid) so the OWNER can hard-delete an account from the admin
-- UI (the "ลบบัญชี" button) — used to clear the automated-test accounts
-- (codexe2e.*, codexfix.*, taksinkubpom+codex*) that only ever existed for E2E
-- runs. Also runs a one-time purge of those codex test accounts.
--
-- Deleting a profile is normally blocked by "on delete restrict" from orders /
-- payments / account_transactions / order_photos, and by no-action references
-- from approved_by / rejected_by / reviewed_by / created_by / updated_by. The
-- routine below detaches the records this account merely ACTED ON (keeps them,
-- nulling the actor) and removes the account's OWN data, then deletes the auth
-- user — the profile row cascades away with it.
--
-- OPTIONAL preview before applying — see which accounts the codex purge will
-- remove (must all be test accounts, never a real one, never the owner):
--   select email, role, status, is_owner from public.profiles
--   where email ilike '%codex%' and is_owner = false order by email;

-- ── Reusable owner-only deletion RPC (powers the admin "ลบบัญชี" button) ───────
create or replace function public.delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.is_owner() then
    raise exception 'Only the owner can delete accounts';
  end if;
  if target_user_id = actor then
    raise exception 'Cannot delete your own account';
  end if;
  if exists (select 1 from public.profiles where id = target_user_id and is_owner) then
    raise exception 'Cannot delete the shop owner';
  end if;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  -- Detach records this account only acted on (keep the records).
  update public.orders set approved_by = null where approved_by = target_user_id;
  update public.orders set rejected_by = null where rejected_by = target_user_id;
  update public.payments set reviewed_by = null where reviewed_by = target_user_id;
  update public.account_transactions set created_by = null where created_by = target_user_id;
  update public.inventory_movements set created_by = null where created_by = target_user_id;
  update public.app_settings set updated_by = null where updated_by = target_user_id;
  update public.profiles set approved_by = null where approved_by = target_user_id;

  -- Remove the account's own data (order_items / order_photos / outbox cascade
  -- with the orders; customer_product_discounts cascade with the profile).
  delete from public.account_transactions where customer_id = target_user_id;
  delete from public.order_photos where uploaded_by = target_user_id;
  delete from public.payments where customer_id = target_user_id;
  delete from public.orders where customer_id = target_user_id;
  delete from public.customer_addresses where customer_id = target_user_id;

  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.delete_user(uuid) to authenticated;
revoke execute on function public.delete_user(uuid) from public, anon;

-- ── One-time purge of the E2E/codex test accounts ────────────────────────────
-- Same steps as delete_user, run for every codex-* account at once. Guarded to
-- never touch the owner. Idempotent: a re-run finds nothing and is a no-op.
do $$
declare
  ids uuid[];
  emails text;
begin
  select coalesce(array_agg(id), '{}'), string_agg(email, ', ' order by email)
    into ids, emails
  from public.profiles
  where email ilike '%codex%' and is_owner = false;

  if coalesce(array_length(ids, 1), 0) = 0 then
    raise notice 'ไม่พบบัญชีทดสอบ codex ที่ต้องลบ';
    return;
  end if;

  raise notice 'กำลังลบบัญชีทดสอบ % บัญชี: %', array_length(ids, 1), emails;

  perform set_config('app.allow_profile_account_mutation', 'on', true);

  update public.orders set approved_by = null where approved_by = any(ids);
  update public.orders set rejected_by = null where rejected_by = any(ids);
  update public.payments set reviewed_by = null where reviewed_by = any(ids);
  update public.account_transactions set created_by = null where created_by = any(ids);
  update public.inventory_movements set created_by = null where created_by = any(ids);
  update public.app_settings set updated_by = null where updated_by = any(ids);
  update public.profiles set approved_by = null where approved_by = any(ids);

  delete from public.account_transactions where customer_id = any(ids);
  delete from public.order_photos where uploaded_by = any(ids);
  delete from public.payments where customer_id = any(ids);
  delete from public.orders where customer_id = any(ids);
  delete from public.customer_addresses where customer_id = any(ids);

  delete from auth.users where id = any(ids);

  raise notice 'ลบบัญชีทดสอบ codex เรียบร้อย';
end $$;
