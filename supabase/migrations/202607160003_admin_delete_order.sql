-- 2026-07-16
-- Hard-delete a mis-keyed order (e.g. one an admin keyed on behalf of a customer
-- with the wrong items) as long as it has NOT shipped yet. Unlike cancel — which
-- reverses and keeps a 'cancelled' record — this removes the order entirely so a
-- keying mistake leaves no trace.
--
-- FKs referencing orders: order_items / order_photos / line_notification_outbox
-- CASCADE (auto-removed); account_transactions.order_id and
-- inventory_movements.order_id are SET NULL, so this deletes those rows
-- explicitly to avoid leaving dangling ledger / movement history.
create or replace function public.admin_delete_order(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  order_row public.orders%rowtype;
  item record;
begin
  if actor is null or not public.is_admin() then
    raise exception 'Only admins can delete orders';
  end if;

  select * into order_row
  from public.orders
  where id = target_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  -- Shipped/delivered orders are real fulfilled sales — never hard-delete them.
  if order_row.status in ('shipping', 'delivered') then
    raise exception 'Cannot delete an order that has already shipped';
  end if;

  -- Restore stock still reserved (active statuses hold the reservation made at
  -- create_order; cancelled/rejected already had it restored).
  if order_row.status in ('pending_admin', 'approved', 'packing', 'ready_to_ship') then
    for item in
      select product_id, quantity from public.order_items where order_id = target_order_id
    loop
      update public.inventory
      set quantity_available = quantity_available + item.quantity
      where product_id = item.product_id;
    end loop;
  end if;

  -- Reverse debt applied at approval, if it hasn't already been reversed. Clamp
  -- at zero, matching cancel_approved_order.
  if order_row.status in ('approved', 'packing', 'ready_to_ship')
     and order_row.debt_applied_at is not null then
    perform set_config('app.allow_profile_account_mutation', 'on', true);
    update public.profiles
    set debt_balance = greatest(0, debt_balance - order_row.subtotal)
    where id = order_row.customer_id;
  end if;

  -- Remove the ledger + stock-movement rows tied to this order (their FKs are
  -- SET NULL, so they'd otherwise linger detached), then the order itself
  -- (order_items / order_photos / outbox cascade away with it).
  delete from public.account_transactions where order_id = target_order_id;
  delete from public.inventory_movements where order_id = target_order_id;
  delete from public.orders where id = target_order_id;
end;
$$;

grant execute on function public.admin_delete_order(uuid) to authenticated;
revoke execute on function public.admin_delete_order(uuid) from public, anon;
