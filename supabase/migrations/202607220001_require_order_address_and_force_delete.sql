-- 2026-07-22
-- Two customer-requested changes:
--
-- (1) Require a shipping address on CUSTOMER self-service orders. Until now
--     create_order accepted a null shipping_address_id, so a customer could
--     confirm an order with no delivery address. Enforce it in the customer
--     wrapper only — admin_create_order (phone/walk-in orders) stays optional,
--     since staff attach the address during packing.
--
-- (2) Make admin order-delete a true FORCE delete. The 2026-07-16 audit added a
--     guard refusing to delete an approved order once a payment had reduced the
--     customer's debt below the order value ("Order already partly paid — cancel
--     instead"). That guard blocks cleaning up a mis-keyed / test order that a
--     test payment was recorded against. Per the shop owner, delete is an
--     escape-hatch for mistakes and must always work on a not-yet-shipped order.
--     We drop the payment guard; the shipped/delivered guard stays (those are
--     real fulfilled sales). The debt reversal keeps its greatest(0, …) clamp so
--     profiles.debt_balance can never go negative (its CHECK forbids it). Note:
--     payments are account-level (no order_id), so any payment already recorded
--     stays as a credit against the account — deleting the order just zeroes the
--     debt this order added; it does not delete unrelated payment records.

-- ── (1) create_order: shipping address now required for customers ──────────
create or replace function public.create_order(
  items jsonb,
  shipping_address_id uuid default null,
  customer_note text default null,
  shipping_method text default 'flash'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null or not public.is_approved_customer() then
    raise exception 'Only approved customers can create orders';
  end if;

  if shipping_address_id is null then
    raise exception 'Shipping address is required';
  end if;

  return public._place_order(actor, actor, items, shipping_address_id, customer_note, shipping_method);
end;
$$;

grant execute on function public.create_order(jsonb, uuid, text, text) to authenticated;
revoke execute on function public.create_order(jsonb, uuid, text, text) from public, anon;

-- ── (2) admin_delete_order: force-delete any not-yet-shipped order ─────────
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

  -- Reverse the debt this order applied at approval. Clamp at zero: if payments
  -- already brought the balance below this order's value, the debt simply goes to
  -- 0 (a negative/credit balance is not modelled — debt_balance has CHECK >= 0).
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
