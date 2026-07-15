-- 2026-07-16
-- delete_user (202607140002) detached orders.approved_by / rejected_by but MISSED
-- orders.cancelled_by (also a no-action FK to profiles). Deleting an admin who had
-- ever cancelled an approved order would therefore fail with a foreign-key error.
-- Now that permanent delete is the primary way to remove a team account, add the
-- missing detach so any staff/admin can be deleted cleanly. Identical to the
-- 202607140002 routine plus the cancelled_by line.

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
  update public.orders set cancelled_by = null where cancelled_by = target_user_id;
  update public.payments set reviewed_by = null where reviewed_by = target_user_id;
  update public.account_transactions set created_by = null where created_by = target_user_id;
  update public.inventory_movements set created_by = null where created_by = target_user_id;
  update public.app_settings set updated_by = null where updated_by = target_user_id;
  update public.profiles set approved_by = null where approved_by = target_user_id;

  -- Remove the account's own data (order_items / order_photos on its own orders /
  -- outbox cascade with the orders; discounts cascade with the profile).
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
