-- Protect the shop-owner account from other admins (2026-07-14).
--
-- The users screen let any admin change roles or suspend any staff card,
-- including the owner's — and neither suspend_customer nor approve_customer
-- guarded against an is_owner target. A non-owner admin could therefore suspend
-- the owner (status='suspended' → is_owner() returns false → the owner is locked
-- out of their own system) or demote the owner's role. The app now blocks this
-- in the server actions + UI; this adds the same guard at the RPC layer so a
-- direct API call can't bypass it either. Ownership must be transferred with
-- owner_set_owner_flag (owner-only) before the account can be managed normally.

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

  if exists (select 1 from public.profiles where id = target_user_id and is_owner) then
    raise exception 'Cannot suspend the shop owner';
  end if;

  update public.profiles
  set status = 'suspended'
  where id = target_user_id;
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

  if exists (select 1 from public.profiles where id = target_user_id and is_owner) then
    raise exception 'Cannot change the owner account';
  end if;

  update public.profiles
  set status = 'approved',
      role = target_role,
      approved_at = now(),
      approved_by = actor
  where id = target_user_id;
end;
$$;
