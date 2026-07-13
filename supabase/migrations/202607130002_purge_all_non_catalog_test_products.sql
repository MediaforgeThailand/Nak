-- Purge ALL leftover test/demo products, not just the 12 known SKUs (2026-07-13).
--
-- 202607130001 removed the hardcoded DEMO-*/NAK-* set, but the admin product list
-- still showed automated-test junk with timestamped SKUs the earlier list could
-- never enumerate: CODEX-AUDIT-*, CODEX-E2E-*, CODEX-FIX-* ("Codex … Test Shirt")
-- and MARBO-9000 (a fake ฿320 "Marbo9000" — the real one is SKU MB9K-* at ฿230).
--
-- Instead of chasing test SKU patterns, this defines the catalog POSITIVELY: the
-- real catalog is exactly the 179 products seeded by 202607110001, whose SKUs all
-- start with one of six prefixes. Anything else is not a real product. To stay
-- safe against a real product an admin might add later with an off-scheme SKU, the
-- target is further restricted to is_active = false — the real seed leaves every
-- product active, and 202607110001 deactivated all non-seed rows, so "deactivated
-- AND off-scheme SKU" is precisely the test junk (an admin-added real product is
-- active; an admin-deactivated real product still matches a prefix and is spared).
--
-- Debt is handled exactly like 202607130001: only test-only accounts are touched,
-- and only that order's debt footprint is subtracted (targeted delta, clamped at
-- 0 — never a full ledger recompute), so kept payments can't bleed onto real debt.
-- Aborts the whole run untouched if any single order mixes a test and a real
-- product. Idempotent: re-running is a no-op.
--
-- ONE-TIME cleanup. The is_active=false restriction is a safety proxy, not an
-- enforced rule: nothing stops an admin from later creating a genuine product
-- with an off-scheme SKU and deactivating it — re-running this then would delete
-- it. So BEFORE running the DO block below, run this read-only preview ALONE and
-- confirm every row is test/demo junk (never a real flavour):
--
--   select sku, name, is_active
--   from public.products
--   where is_active = false
--     and sku not like 'MB9K-%' and sku not like 'MSW15K-%'
--     and sku not like 'RLXC20K-%' and sku not like 'RLXD30K-%'
--     and sku not like 'MBAR10K-%' and sku not like 'RLXPOD-%'
--   order by sku;
--
-- The DO block also RAISE NOTICEs the exact SKU list it deletes.

do $$
declare
  junk_product_ids uuid[];
  junk_order_ids uuid[];
  affected_customer_ids uuid[];
  real_customer_ids uuid[];        -- affected accounts that ALSO have real orders
  pure_test_order_ids uuid[];      -- test orders whose account is test-only
  mixed_orders integer;
  kept_skus text;
  n integer;
begin
  -- Real catalog SKUs all start with one of these; everything deactivated that
  -- does not is leftover test/demo data.
  select coalesce(array_agg(id), '{}') into junk_product_ids
  from public.products
  where is_active = false
    and sku not like 'MB9K-%'
    and sku not like 'MSW15K-%'
    and sku not like 'RLXC20K-%'
    and sku not like 'RLXD30K-%'
    and sku not like 'MBAR10K-%'
    and sku not like 'RLXPOD-%';

  if coalesce(array_length(junk_product_ids, 1), 0) = 0 then
    raise notice 'ไม่พบสินค้าทดสอบ/ตกค้างที่ต้องลบ — จบ';
    return;
  end if;

  -- Echo exactly what will be removed (SKUs must all be test/demo junk).
  select string_agg(sku, ', ' order by sku) into kept_skus
  from public.products where id = any(junk_product_ids);
  raise notice 'กำลังจะลบสินค้าที่ไม่อยู่ในแคตตาล็อกจริง (% รายการ): %',
    array_length(junk_product_ids, 1), kept_skus;

  select coalesce(array_agg(distinct order_id), '{}') into junk_order_ids
  from public.order_items
  where product_id = any(junk_product_ids);

  -- Guard: a test product must never share an order with a real product, or
  -- deleting the order would destroy real order history. Abort the whole run.
  select count(distinct oi.order_id) into mixed_orders
  from public.order_items oi
  where oi.order_id = any(junk_order_ids)
    and not (oi.product_id = any(junk_product_ids));

  if mixed_orders > 0 then
    raise exception 'พบ % ออเดอร์ที่มีสินค้าทดสอบปนกับสินค้าจริงในออเดอร์เดียวกัน — ยกเลิกทั้งหมด ยังไม่มีอะไรถูกลบ กรุณาตรวจสอบออเดอร์เหล่านั้นด้วยมือก่อน', mixed_orders;
  end if;

  select coalesce(array_agg(distinct customer_id), '{}') into affected_customer_ids
  from public.orders
  where id = any(junk_order_ids);

  -- An account is "real" if any of its orders contains a line for a real product.
  -- Such accounts are never touched — their debt stays exactly as is.
  select coalesce(array_agg(distinct o.customer_id), '{}') into real_customer_ids
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.customer_id = any(affected_customer_ids)
    and not (oi.product_id = any(junk_product_ids));

  select coalesce(array_agg(id), '{}') into pure_test_order_ids
  from public.orders
  where id = any(junk_order_ids)
    and not (customer_id = any(real_customer_ids));

  -- ── (1) Subtract the test orders' debt footprint from test-only accounts ────
  if coalesce(array_length(pure_test_order_ids, 1), 0) > 0 then
    perform set_config('app.allow_profile_account_mutation', 'on', true);

    update public.profiles p
    set debt_balance = greatest(0::numeric, p.debt_balance - adj.contribution),
        updated_at = now()
    from (
      select t.customer_id, sum(t.amount) as contribution
      from public.account_transactions t
      where t.order_id = any(pure_test_order_ids)
      group by t.customer_id
    ) adj
    where p.id = adj.customer_id
      and adj.contribution <> 0;
    get diagnostics n = row_count;
    raise notice 'ปรับยอดหนี้บัญชีทดสอบ (หักเฉพาะส่วนออเดอร์ทดสอบ): % บัญชี', n;

    delete from public.account_transactions
    where order_id = any(pure_test_order_ids);
    get diagnostics n = row_count;
    raise notice 'ลบรายการ ledger ของออเดอร์ทดสอบ: % แถว', n;

    delete from public.orders
    where id = any(pure_test_order_ids);
    get diagnostics n = row_count;
    raise notice 'ลบออเดอร์ทดสอบ: % ออเดอร์', n;
  end if;

  -- ── (2) Hard-delete test products that now have zero order lines left ───────
  delete from public.inventory_movements m
  where m.product_id = any(junk_product_ids)
    and not exists (select 1 from public.order_items oi where oi.product_id = m.product_id);

  delete from public.products p
  where p.id = any(junk_product_ids)
    and not exists (select 1 from public.order_items oi where oi.product_id = p.id);
  get diagnostics n = row_count;
  raise notice 'ลบสินค้าทดสอบแบบถาวร: % รายการ', n;

  -- ── (3) Report any test product still pinned by a real account's order ──────
  select string_agg(sku, ', ' order by sku) into kept_skus
  from public.products
  where id = any(junk_product_ids);

  if kept_skus is not null then
    raise notice 'สินค้าทดสอบที่ยังลบไม่ได้ (มีออเดอร์ของบัญชีที่มีสินค้าจริงอ้างถึง กรุณาตรวจด้วยมือ): %', kept_skus;
  end if;
end $$;
