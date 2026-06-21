create or replace function public.admin_update_customer_discount(
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
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can update customer discounts';
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

grant execute on function public.admin_update_customer_discount(uuid, numeric) to authenticated;
