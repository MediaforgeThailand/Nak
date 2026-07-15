-- 2026-07-16
-- The products.price values were the shop's COST, not the customer selling price
-- — customers were seeing cost. This migration:
--   1. Moves the current price into a staff-only product_costs table (customers
--      can never read it via RLS; it lives in a separate table so products.* — the
--      customer catalog query — doesn't expose it at all).
--   2. Sets products.price to the REAL customer selling price per product line.
--   3. Teaches create_product_with_inventory to take a cost and store it, and lets
--      STAFF (not only admins) create products (the add-product form is staff-facing;
--      the RPC previously still required is_admin, which broke staff creates).

-- ── 1. Staff-only cost table ──────────────────────────────────────────────
create table if not exists public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

-- Backfill: today's products.price IS the cost — capture it BEFORE we overwrite price.
insert into public.product_costs (product_id, cost_price)
select id, price from public.products
on conflict (product_id) do nothing;

drop trigger if exists product_costs_touch_updated_at on public.product_costs;
create trigger product_costs_touch_updated_at
before update on public.product_costs
for each row execute function public.touch_updated_at();

alter table public.product_costs enable row level security;

drop policy if exists "Staff read product costs" on public.product_costs;
create policy "Staff read product costs"
on public.product_costs for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "Admins manage product costs" on public.product_costs;
create policy "Admins manage product costs"
on public.product_costs for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ── 2. Real customer selling prices (matched by stable SKU prefix) ─────────
update public.products set price = 320 where sku like 'MB9K-AUTH-%';        -- Marbo9k แท้
update public.products set price = 250 where sku like 'MB9K-TIEB-%';        -- Marbo9k เทียบ
update public.products set price = 300 where sku like 'MSW15K-POD-AUTH-%';  -- Mswitch15k หัวแท้
update public.products set price = 250 where sku like 'MSW15K-POD-TIEB-%';  -- Mswitch15k หัวเทียบ
update public.products set price = 500 where sku like 'MSW15K-SET-%';       -- Mswitch15k เซต (เครื่อง+หัว)
update public.products set price = 250 where sku like 'MSW15K-DEV-%';       -- Mswitch15k เครื่องเปล่า
update public.products set price = 300 where sku like 'RLXC20K-%';          -- RELX CREATOR20K
update public.products set price = 380 where sku like 'RLXD30K-%';          -- RELX DIVA30k
update public.products set price = 350 where sku like 'MBAR10K-AUTH-%';     -- MBAR 10K แท้
update public.products set price = 300 where sku like 'MBAR10K-TIEB-%';     -- MBAR 10K เทียบ
update public.products set price = 120 where sku like 'RLXPOD-%';           -- หัว RELX

-- ── 3. create_product_with_inventory: allow staff + store cost ─────────────
-- Drop the old 9-arg admin-only version so only the cost-aware one remains.
drop function if exists public.create_product_with_inventory(text, text, numeric, text, integer, integer, text, uuid, text);

create or replace function public.create_product_with_inventory(
  sku text,
  name text,
  price numeric,
  unit text default 'piece',
  quantity_available integer default 0,
  low_stock_threshold integer default 5,
  description text default null,
  category_id uuid default null,
  image_path text default null,
  cost_price numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  product_id uuid;
begin
  -- Staff may add products (the add-product form is staff-facing); admins too.
  if actor is null or not public.is_staff_or_admin() then
    raise exception 'Only staff can create products';
  end if;

  insert into public.products(sku, name, price, unit, description, category_id, image_path)
  values (sku, name, price, coalesce(nullif(unit, ''), 'piece'), nullif(description, ''), category_id, nullif(image_path, ''))
  returning id into product_id;

  insert into public.inventory(product_id, quantity_available, low_stock_threshold)
  values (product_id, greatest(0, quantity_available), greatest(0, low_stock_threshold));

  insert into public.inventory_movements(product_id, type, quantity_delta, quantity_after, note, created_by)
  values (product_id, 'initial', greatest(0, quantity_available), greatest(0, quantity_available), 'Initial product stock', actor);

  insert into public.product_costs(product_id, cost_price)
  values (product_id, greatest(0, coalesce(cost_price, 0)));

  return product_id;
end;
$$;

grant execute on function public.create_product_with_inventory(text, text, numeric, text, integer, integer, text, uuid, text, numeric) to authenticated;
revoke execute on function public.create_product_with_inventory(text, text, numeric, text, integer, integer, text, uuid, text, numeric) from public, anon;
