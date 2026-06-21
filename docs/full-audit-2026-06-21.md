# NAK Full Audit - 2026-06-21

## Scope

Audit ครอบคลุม user app, admin panel, frontend UX, backend actions, Supabase RPC, RLS/advisor, Storage, stock, order, debt, payment, discount, manual payment, และ LINE-browser/camera readiness.

Artifacts:
- Screenshot folder: `C:\Users\taksi\AppData\Local\Temp\nak-full-audit-ui-20260621100812\screenshots`
- UI report JSON: `C:\Users\taksi\AppData\Local\Temp\nak-full-audit-ui-20260621100812\round1-report.json`
- API/DB report JSON: `C:\Users\taksi\AppData\Local\Temp\nak-full-audit-ui-20260621100812\round2-report.json`

## Validation Summary

Build and lint:
- `npm run lint` passed.
- `npm run build` passed on Next.js 16.2.9.

Round 1, browser E2E with mobile LINE-like user agent:
- Admin login passed.
- Admin created product with uploaded image and initial stock.
- Admin adjusted stock +5 and inventory movement was recorded.
- Customer login passed.
- Customer added product to cart and submitted order from `/home`.
- Stock was reserved immediately at order submit.
- Discount calculation was correct: 3 units, price 123, discount 7/unit, total before discount 369, discount 21, subtotal 348.
- Debt was not applied before approval.
- Admin approved order; order moved to `packing`, debt became 348, transaction `order_debt` was recorded.
- Admin uploaded packed-product photo and shipped; order moved to `shipping`, storage object exists.
- Customer submitted payment slip for 348.
- Admin approved payment; payment moved to `approved`, debt returned to 0, transaction `payment_credit` was recorded.

Round 2, API/DB method:
- Admin/customer auth tokens worked.
- Anonymous admin RPC calls did not mutate data.
- Customer could not adjust inventory, approve order, or update discount.
- Oversell order failed and stock remained unchanged.
- Admin could update discount to 8 and restore to 7.
- Customer API order qty 2 reserved stock; admin rejection restored stock and wrote `order_rejected_restore`.
- Owner/admin manual debt +5 worked.
- Admin manual payment without slip worked, recorded approved `admin_manual` payment, and returned debt to 0.
- DB invariants passed: stock equals movement sum, order subtotal equals item sum, discount total equals item discount sum, storage objects exist, and notification outbox rows were queued.

Cleanup performed after audit:
- All `CODEX-AUDIT-*` products were set inactive.
- Audit auth users were banned.
- Audit profiles were suspended and stripped of admin/owner privileges.
- Final cleanup check: active audit products 0, approved audit profiles 0, privileged audit profiles 0, unbanned audit auth users 0.

## Findings

### P1 - Security Hardening: Security Definer RPC Surface Is Too Broad

Supabase advisor reports several `SECURITY DEFINER` functions executable by `anon` or broadly by `authenticated`, especially functions added in recent migrations: `admin_record_manual_payment`, `admin_update_customer_discount`, `owner_adjust_customer_debt`, `owner_update_customer_discount`, and helper checks. Runtime guards did block anonymous/customer misuse during tests, so this is not an observed mutation exploit. Still, exposed security-definer RPCs increase attack surface.

Relevant files:
- `supabase/migrations/202606210001_owner_discount_manual_accounting.sql:629`
- `supabase/migrations/202606210003_admin_customer_role_separation.sql:34`
- `supabase/migrations/202606200001_initial_inventory_credit_system.sql:1063`

Recommended fix:
- Revoke execute from `public` and `anon` for all security-definer functions.
- Grant only the exact functions that need browser access to `authenticated`.
- Prefer server-only route handlers/actions for admin/owner-only mutations where possible.
- Re-run `supabase db advisors --linked -o json`.

### P1 - Approve And Ship Flows Are Not Fully Atomic

`approveOrderAction` calls `approve_order`, then separately calls `update_order_status` to move to `packing`. If the second RPC fails after the first succeeds, debt can be applied while order remains `approved`.

`shipOrderWithPhotoAction` uploads to Storage, inserts `order_photos`, then separately updates status to `shipping`. If the final status update fails, the photo can remain while the order is not shipped.

Relevant files:
- `src/app/actions/admin.ts:261`
- `src/app/actions/admin.ts:364`

Recommended fix:
- Create single DB functions such as `approve_order_and_start_packing` and `ship_order_with_photo`.
- Keep DB state changes in one transaction.
- For Storage upload, keep current cleanup pattern but also remove uploaded object if final DB transaction fails.

### P2 - React/Next Form Console Errors From `encType` On Server Action Forms

Browser console repeatedly logged: `Cannot specify a encType or method for a form that specifies a function as the action. React provides those automatically.`

Relevant files:
- `src/app/(customer)/payments/new/page.tsx:41`
- `src/app/admin/(panel)/orders/page.tsx:273`
- `src/app/admin/(panel)/products/page.tsx:87`
- `src/app/admin/(panel)/products/page.tsx:130`
- `src/app/admin/(panel)/payments/page.tsx:52`

Recommended fix:
- Remove `encType="multipart/form-data"` from forms whose `action` is a server function. React/Next handles it.

### P2 - Floating Back/Menu Buttons Can Obscure Work Areas On Mobile

Screenshots show the floating back button and admin drawer button sitting above active form areas, especially order shipping/photo upload and customer checkout/profile. This is risky for LINE browser users because the button is important, but it can cover fields or action context.

Relevant files:
- `src/components/layout/floating-back-button.tsx:94`
- `src/components/layout/mobile-drawer-shell.tsx:33`
- `src/app/globals.css:148`

Recommended fix:
- Reserve a fixed safe action zone with bottom padding per layout.
- Move the floating back button higher only when a bottom nav/drawer exists, but keep it away from form submit areas.
- Consider hiding it on login/pending pages or using a smaller edge tab style on form-heavy admin pages.

### P2 - Admin Products Page Is Too Heavy On Mobile

The admin product page renders every product as a full edit form with image upload controls. It works, but it creates a very long page and makes find/edit/delete slow on mobile.

Relevant file:
- `src/app/admin/(panel)/products/page.tsx:124`

Recommended fix:
- Add search/filter.
- Render compact product rows/cards first.
- Open edit form in a detail drawer or separate in-page panel.
- Keep create product as its own focused section.

### P2 - Admin Payments Page Prioritizes Manual Payment Form Over Slip Review

On mobile, the manual payment form takes the first screen, while pending/approved slips are below. Staff who mainly verify slips must scroll past a large form.

Relevant file:
- `src/app/admin/(panel)/payments/page.tsx:52`

Recommended fix:
- Add tabs: `รอตรวจสลิป`, `อนุมัติแล้ว`, `บันทึกชำระเอง`.
- Default to pending slips for daily operations.

### P2 - Payment Approval Revalidation Is Too Narrow

`approvePaymentAction` only revalidates `/admin/payments`. The DB updates correctly, but customer profile/transactions may remain stale until navigation or refresh.

Relevant file:
- `src/app/actions/admin.ts:419`

Recommended fix:
- Also revalidate `/profile`, `/transactions`, and any customer order detail route affected by current debt display.

### P2 - Product Image Storage Orphans Are Possible

Product update uploads a new image and updates `image_path`, but old product image objects are not removed. Soft delete only sets `is_active=false`, so old images remain indefinitely.

Relevant files:
- `src/app/actions/admin.ts:176`
- `src/app/actions/admin.ts:223`

Recommended fix:
- On successful image replacement, remove old image object.
- Add a storage cleanup job for inactive products if hard cleanup is desired.

### P3 - RLS Policies Need Performance Cleanup

Supabase advisor reports RLS initplan warnings on multiple tables and multiple permissive SELECT policies on products, inventory, categories, and app settings.

Recommended fix:
- Wrap `auth.uid()` / role helper calls in policies as `(select auth.uid())` or equivalent helper patterns.
- Consolidate overlapping permissive policies.

### P3 - LINE Notification Delivery Was Not Verified

`line_notification_outbox` rows were queued for order/payment events. This proves the app writes notification intents, but not that an external LINE delivery worker exists or successfully sends.

Recommended fix:
- Add a worker/cron route for outbox processing.
- Add retry, idempotency, and delivery status monitoring.

### P3 - Minor Console/Performance Warnings

Observed:
- Missing `data-scroll-behavior="smooth"` warning because global smooth scroll is enabled.
- LCP image warning for a signed order photo above the fold.

Relevant files:
- `src/app/layout.tsx:29`
- `src/app/(customer)/orders/[id]/page.tsx:139`

Recommended fix:
- Add `data-scroll-behavior="smooth"` to `<html>`.
- Add priority/loading tuning only for first above-fold order photo if it is truly above the fold.

## Overall Verdict

Core business flow is working: product creation, stock adjustment, immediate stock reservation, approval debt, shipping photo, payment slip, admin approval, manual debt/payment, discount, reject/restore, Storage, and DB calculations all passed.

Before showing to a real customer, I would fix the P1/P2 items first: RPC hardening, atomic approve/ship DB functions, form console errors, mobile floating button overlap, and admin product/payment UX density.
