-- 2026-07-16
-- Let any ADMIN (not only the owner) delete a TEAM account (admin / factory_staff).
-- Deleting a CUSTOMER stays owner-only, because it wipes that customer's sales
-- history and would distort the reports. Owner and self are always protected.
-- (Same detach/delete routine as 202607160002, with a role-based guard.)
create or replace function public.delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  target_role public.user_role;
  target_is_owner boolean;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can delete accounts';
  end if;
  if target_user_id = actor then
    raise exception 'Cannot delete your own account';
  end if;

  select role, is_owner into target_role, target_is_owner
  from public.profiles
  where id = target_user_id;

  if not found then
    raise exception 'Account not found';
  end if;
  if target_is_owner then
    raise exception 'Cannot delete the shop owner';
  end if;
  -- Customer accounts carry sales history — only the owner may remove them.
  if target_role = 'customer' and not public.is_owner() then
    raise exception 'Only the owner can delete customer accounts';
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

  -- Remove the account's own data.
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
