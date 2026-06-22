alter table public.profiles
add column if not exists signup_scope text not null default 'customer'
check (signup_scope in ('customer', 'staff'));

update public.profiles as profile
set signup_scope = 'staff'
from auth.users as auth_user
where auth_user.id = profile.id
  and auth_user.raw_user_meta_data->>'account_scope' = 'staff';

create index if not exists profiles_signup_scope_status_idx
on public.profiles(signup_scope, status);

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
