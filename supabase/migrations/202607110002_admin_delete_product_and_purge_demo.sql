-- Product deletion (admin only) + purge of the demo/mockup catalog.
--
-- Hard-deleting a product that already appears in orders would violate
-- order_items.product_id (on delete restrict) and destroy sales history, so
-- admin_delete_product deactivates those instead and reports which path it
-- took. Products never sold are removed for real, together with their stock
-- movement history (inventory / customer_product_discounts / product_price_tiers
-- rows cascade automatically).

create or replace function public.admin_delete_product(p_product_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  has_orders boolean;
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Product not found';
  end if;

  select exists (
    select 1 from public.order_items oi where oi.product_id = p_product_id
  ) into has_orders;

  if has_orders then
    update public.products
    set is_active = false,
        updated_at = now()
    where id = p_product_id;
    return 'deactivated';
  end if;

  delete from public.inventory_movements where product_id = p_product_id;
  delete from public.products where id = p_product_id;
  return 'deleted';
end;
$$;

grant execute on function public.admin_delete_product(uuid) to authenticated;
revoke execute on function public.admin_delete_product(uuid) from public, anon;

-- ── Purge the clothing/prototype mockup products seeded for testing ────────
-- Pinned to the exact 12 seeded SKUs (202606200004 + 202606210002) so a real
-- product an admin might have created with a similar SKU can never be caught.
-- Unsold ones are deleted outright; any that were used in test orders stay in
-- the database for history but are deactivated so no screen shows them.

delete from public.inventory_movements m
where m.product_id in (
  select p.id
  from public.products p
  where p.sku in (
    'DEMO-BOX-001', 'DEMO-TAPE-002', 'DEMO-WRAP-003',
    'NAK-TEE-001', 'NAK-TEE-002', 'NAK-SHIRT-003', 'NAK-DRESS-004',
    'NAK-JACKET-005', 'NAK-BLAZER-006', 'NAK-SKIRT-007', 'NAK-SHOE-008',
    'NAK-KNIT-009'
  )
    and not exists (select 1 from public.order_items oi where oi.product_id = p.id)
);

delete from public.products p
where p.sku in (
  'DEMO-BOX-001', 'DEMO-TAPE-002', 'DEMO-WRAP-003',
  'NAK-TEE-001', 'NAK-TEE-002', 'NAK-SHIRT-003', 'NAK-DRESS-004',
  'NAK-JACKET-005', 'NAK-BLAZER-006', 'NAK-SKIRT-007', 'NAK-SHOE-008',
  'NAK-KNIT-009'
)
  and not exists (select 1 from public.order_items oi where oi.product_id = p.id);

update public.products
set is_active = false,
    updated_at = now()
where sku in (
  'DEMO-BOX-001', 'DEMO-TAPE-002', 'DEMO-WRAP-003',
  'NAK-TEE-001', 'NAK-TEE-002', 'NAK-SHIRT-003', 'NAK-DRESS-004',
  'NAK-JACKET-005', 'NAK-BLAZER-006', 'NAK-SKIRT-007', 'NAK-SHOE-008',
  'NAK-KNIT-009'
)
  and is_active = true;
