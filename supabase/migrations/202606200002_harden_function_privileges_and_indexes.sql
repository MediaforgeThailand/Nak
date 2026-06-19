create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

grant execute on function public.has_role(public.user_role[]) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_staff_or_admin() to authenticated;
grant execute on function public.is_approved_customer() to authenticated;

grant execute on function public.create_order(jsonb, uuid, text) to authenticated;
grant execute on function public.approve_order(uuid, text) to authenticated;
grant execute on function public.reject_order(uuid, text) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text) to authenticated;
grant execute on function public.upload_order_photo(uuid, text, text) to authenticated;
grant execute on function public.submit_payment(numeric, text, date, text) to authenticated;
grant execute on function public.approve_payment(uuid, text) to authenticated;
grant execute on function public.reject_payment(uuid, text) to authenticated;
grant execute on function public.adjust_inventory(uuid, integer, text) to authenticated;
grant execute on function public.approve_customer(uuid, public.user_role) to authenticated;
grant execute on function public.suspend_customer(uuid) to authenticated;
grant execute on function public.create_product_with_inventory(text, text, numeric, text, integer, integer, text, uuid, text) to authenticated;

create index if not exists account_transactions_created_by_idx on public.account_transactions(created_by);
create index if not exists account_transactions_order_id_idx on public.account_transactions(order_id);
create index if not exists account_transactions_payment_id_idx on public.account_transactions(payment_id);
create index if not exists app_settings_updated_by_idx on public.app_settings(updated_by);
create index if not exists inventory_movements_created_by_idx on public.inventory_movements(created_by);
create index if not exists inventory_movements_order_id_idx on public.inventory_movements(order_id);
create index if not exists line_outbox_customer_id_idx on public.line_notification_outbox(customer_id);
create index if not exists line_outbox_order_id_idx on public.line_notification_outbox(order_id);
create index if not exists line_outbox_payment_id_idx on public.line_notification_outbox(payment_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_photos_order_id_idx on public.order_photos(order_id);
create index if not exists order_photos_uploaded_by_idx on public.order_photos(uploaded_by);
create index if not exists orders_approved_by_idx on public.orders(approved_by);
create index if not exists orders_rejected_by_idx on public.orders(rejected_by);
create index if not exists orders_shipping_address_id_idx on public.orders(shipping_address_id);
create index if not exists payments_reviewed_by_idx on public.payments(reviewed_by);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists profiles_approved_by_idx on public.profiles(approved_by);
