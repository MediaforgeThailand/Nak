-- Harden function exposure and make the two multi-step order flows atomic.

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

create or replace function public.approve_order_and_start_packing(
  target_order_id uuid,
  admin_note text default null
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
    raise exception 'Only admins can approve orders';
  end if;

  perform public.approve_order(target_order_id, admin_note);
  perform public.update_order_status(target_order_id, 'packing', 'เริ่มเตรียมจัดส่ง');
end;
$$;

create or replace function public.ship_order_with_photo(
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
    raise exception 'Only staff can ship orders';
  end if;

  if nullif(storage_path, '') is null then
    raise exception 'Packed product photo is required before shipping';
  end if;

  photo_id := public.upload_order_photo(target_order_id, storage_path, caption);
  perform public.update_order_status(target_order_id, 'shipping', coalesce(nullif(caption, ''), 'จัดส่งแล้ว'));

  return photo_id;
end;
$$;

grant execute on function public.has_role(public.user_role[]) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;
grant execute on function public.is_approved_customer() to authenticated;
grant execute on function public.is_owner() to authenticated;

grant execute on function public.create_order(jsonb, uuid, text) to authenticated;
grant execute on function public.approve_order(uuid, text) to authenticated;
grant execute on function public.approve_order_and_start_packing(uuid, text) to authenticated;
grant execute on function public.reject_order(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.upload_order_photo(uuid, text, text) to authenticated;
grant execute on function public.ship_order_with_photo(uuid, text, text) to authenticated;
grant execute on function public.submit_payment(numeric, text, date, text) to authenticated;
grant execute on function public.approve_payment(uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
grant execute on function public.approve_customer(uuid, public.user_role) to authenticated;
grant execute on function public.suspend_customer(uuid) to authenticated;
grant execute on function public.create_product_with_inventory(text, text, numeric, text, integer, integer, text, uuid, text) to authenticated;
grant execute on function public.owner_update_customer_discount(uuid, numeric) to authenticated;
grant execute on function public.owner_adjust_customer_debt(uuid, numeric, text) to authenticated;
grant execute on function public.admin_record_manual_payment(uuid, numeric, text, date, text) to authenticated;
grant execute on function public.admin_update_customer_discount(uuid, numeric) to authenticated;
