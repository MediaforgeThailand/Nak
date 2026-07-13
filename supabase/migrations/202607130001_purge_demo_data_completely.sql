-- Purge the demo/mockup catalog COMPLETELY (2026-07-13, owner request: no demo
-- product may keep appearing in the admin product list, not even as ปิดขาย).
--
-- 202607110001 only DEACTIVATED the demo products (they are is_active=false but
-- still listed in /admin/products), and 202607110002 could only hard-delete the
-- ones never used in an order. This migration removes them for real — but must
-- never silently rewrite a REAL customer's debt while doing so, and the live DB
-- can't be inspected from here. So it is deliberately conservative:
--
--   1. Hard-delete demo products that were never ordered by anyone (safe: no FK,
--      no history, no ledger touched).
--   2. For demo products ordered ONLY by "pure-demo" accounts (accounts that have
--      NO order line for any real product), delete those test orders, remove the
--      demo order's own ledger rows, and subtract EXACTLY that order's debt
--      footprint from the account's balance (targeted delta, clamped at 0 — not a
--      full recompute, so kept payments/adjustments can't bleed onto real debt).
--      Then hard-delete those products too.
--   3. Any demo product still referenced by an account that also has real orders
--      is LEFT deactivated and reported by name — taksin reviews those by hand.
--
-- Kept test PAYMENTS keep their historical balance_after (a stale running-balance
-- snapshot); those accounts are test accounts slated for purge at handover, and
-- their authoritative debt_balance is corrected here. Storage files (order slips /
-- product images) are not swept — see handover checklist.
--
-- Idempotent: re-running is a no-op. Aborts (whole transaction) without touching
-- anything if a single order ever mixes a demo product with a real product.

do $$
declare
  demo_skus constant text[] := array[
    'DEMO-BOX-001', 'DEMO-TAPE-002', 'DEMO-WRAP-003',
    'NAK-TEE-001', 'NAK-TEE-002', 'NAK-SHIRT-003', 'NAK-DRESS-004',
    'NAK-JACKET-005', 'NAK-BLAZER-006', 'NAK-SKIRT-007', 'NAK-SHOE-008',
    'NAK-KNIT-009'
  ];
  demo_product_ids uuid[];
  demo_order_ids uuid[];
  affected_customer_ids uuid[];
  real_customer_ids uuid[];        -- affected accounts that ALSO have real orders
  pure_demo_order_ids uuid[];      -- demo orders whose account is test-only
  mixed_orders integer;
  kept_skus text;
  n integer;
begin
  select coalesce(array_agg(id), '{}') into demo_product_ids
  from public.products
  where sku = any(demo_skus);

  -- Even when the products are already gone, make sure the demo address seeded by
  -- 202606200004 does not linger (it is keyed on the test profile, not a product).
  if coalesce(array_length(demo_product_ids, 1), 0) = 0 then
    delete from public.customer_addresses where label = 'Prototype demo address';
    get diagnostics n = row_count;
    raise notice 'ไม่พบสินค้า demo เหลืออยู่ — ลบที่อยู่ demo % แถว แล้วจบ', n;
    return;
  end if;

  select coalesce(array_agg(distinct order_id), '{}') into demo_order_ids
  from public.order_items
  where product_id = any(demo_product_ids);

  -- Guard: a demo product must never share an order with a real product, or
  -- deleting the order would destroy real order history. Abort the whole run.
  select count(distinct oi.order_id) into mixed_orders
  from public.order_items oi
  where oi.order_id = any(demo_order_ids)
    and not (oi.product_id = any(demo_product_ids));

  if mixed_orders > 0 then
    raise exception 'พบ % ออเดอร์ที่มีสินค้า demo ปนกับสินค้าจริงในออเดอร์เดียวกัน — ยกเลิกทั้งหมด ยังไม่มีอะไรถูกลบ กรุณาตรวจสอบออเดอร์เหล่านั้นด้วยมือก่อน', mixed_orders;
  end if;

  select coalesce(array_agg(distinct customer_id), '{}') into affected_customer_ids
  from public.orders
  where id = any(demo_order_ids);

  -- An account is "real" if any of its orders contains a line for a non-demo
  -- product. Such accounts are never touched — their debt stays exactly as is.
  select coalesce(array_agg(distinct o.customer_id), '{}') into real_customer_ids
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.customer_id = any(affected_customer_ids)
    and not (oi.product_id = any(demo_product_ids));

  select coalesce(array_agg(id), '{}') into pure_demo_order_ids
  from public.orders
  where id = any(demo_order_ids)
    and not (customer_id = any(real_customer_ids));

  -- ── (1) Subtract the demo orders' debt footprint from pure-demo accounts ────
  -- Targeted delta: remove exactly what these orders added (order_debt +subtotal)
  -- and any cancel reversal (order_reversal, negative) from the CURRENT balance.
  -- Only pure-demo accounts are touched, so kept payments can't reduce real debt.
  if coalesce(array_length(pure_demo_order_ids, 1), 0) > 0 then
    perform set_config('app.allow_profile_account_mutation', 'on', true);

    update public.profiles p
    set debt_balance = greatest(0::numeric, p.debt_balance - adj.contribution),
        updated_at = now()
    from (
      select t.customer_id, sum(t.amount) as contribution
      from public.account_transactions t
      where t.order_id = any(pure_demo_order_ids)
      group by t.customer_id
    ) adj
    where p.id = adj.customer_id
      and adj.contribution <> 0;
    get diagnostics n = row_count;
    raise notice 'ปรับยอดหนี้บัญชีทดสอบ (หักเฉพาะส่วนออเดอร์ demo): % บัญชี', n;

    -- Ledger rows of these demo orders go first: on order delete they would only
    -- get order_id nulled, leaving orphaned demo amounts in the statement.
    delete from public.account_transactions
    where order_id = any(pure_demo_order_ids);
    get diagnostics n = row_count;
    raise notice 'ลบรายการ ledger ของออเดอร์ทดสอบ: % แถว', n;

    -- order_items / order_photos cascade; inventory_movements.order_id -> set null.
    delete from public.orders
    where id = any(pure_demo_order_ids);
    get diagnostics n = row_count;
    raise notice 'ลบออเดอร์ทดสอบ: % ออเดอร์', n;
  end if;

  -- ── (2) Hard-delete demo products that now have zero order lines left ────────
  -- Covers never-ordered products and those whose only orders were just deleted.
  delete from public.inventory_movements m
  where m.product_id = any(demo_product_ids)
    and not exists (select 1 from public.order_items oi where oi.product_id = m.product_id);

  delete from public.products p
  where p.id = any(demo_product_ids)
    and not exists (select 1 from public.order_items oi where oi.product_id = p.id);
  get diagnostics n = row_count;
  raise notice 'ลบสินค้า demo แบบถาวร: % รายการ', n;

  -- ── (3) Report any demo product still pinned by a real account's order ───────
  select string_agg(sku, ', ' order by sku) into kept_skus
  from public.products
  where id = any(demo_product_ids);

  if kept_skus is not null then
    raise notice 'สินค้า demo ที่ยังลบไม่ได้ (มีออเดอร์ของบัญชีที่มีสินค้าจริงอ้างถึง กรุณาตรวจด้วยมือ): %', kept_skus;
  end if;

  -- ── (4) Remove the seeded demo shipping address ─────────────────────────────
  delete from public.customer_addresses where label = 'Prototype demo address';
  get diagnostics n = row_count;
  raise notice 'ลบที่อยู่ demo: % แถว', n;
end $$;
