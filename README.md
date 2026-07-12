# NAK Wholesale — Inventory & Credit System

Mobile-first wholesale ordering system: product catalog with tiered pricing, cart/checkout, credit (debt) tracking, transfer-slip verification, packed-photo proof, Flash/Grab shipping flow, admin reports, and scheduled LINE OA reports. Built for use inside the LINE in-app browser.

**คู่มือส่งมอบ/ติดตั้งภาษาไทยอยู่ที่ [docs/handover.md](docs/handover.md)** — env vars ทั้งหมด, การตั้งค่า LINE console, การสร้างแอดมิน/เจ้าของคนแรก, และเช็คลิสต์ก่อนขึ้นโปรดักชัน

## Stack

- Next.js 16 App Router (proxy.ts middleware, Server Actions), Tailwind CSS v4, deployed on Vercel (region `sin1`)
- Supabase: Auth (email/password + LINE via `custom:line` OAuth + LIFF token exchange), Postgres with RLS, Storage (4 private buckets), SECURITY DEFINER RPCs for every money/stock mutation
- LINE: LIFF auto-login in the in-app browser, Messaging API webhook (staff-group linking), scheduled daily/weekly/monthly flex reports via Vercel Cron

## Feature Overview

**Customer (`/home`, `/products`, `/cart`, `/orders`, `/payments/new`, `/transactions`, `/price-program`, `/profile`)**
- Login with LINE (LIFF inside the LINE app, OAuth on the web) or email/password; new accounts wait for admin approval (`/pending`)
- Catalog with categories, search, stock badges, and the global quantity-discount ladder (Price Program: 2-month rolling floor + admin price lock)
- Checkout reserves stock atomically (`create_order` RPC), chooses Flash/Grab, snapshots the address
- Order tracking with packed-photo gallery; payment page shows a real PromptPay QR (configured in admin settings) and uploads slips for review
- Debt balance, ledger, and payment history on profile/transactions

**Admin (`/admin/...`)**
- Order pipeline: approve (applies debt at `debt_applied_at`) → pack with required photo → Flash handoff / Grab ship; admin-only cancel with stock+debt reversal
- Slip verification, manual payment recording, product/category CRUD with images, stock adjustments with receipt photos, price program management
- Reports hub (sales, receivables, products, customers, stock) using the agreed sales definition: approved orders by `debt_applied_at`, Bangkok days
- User management: customer/staff approval, roles, suspension, owner-rights transfer; owner-only manual debt adjustment
- Settings: PromptPay account, LINE group link status, quota, test report sends

**Roles**: `customer` < `factory_staff` (pack/ship only) < `admin` < owner flag (`is_owner`).

## Environment

Copy `.env.example` to `.env.local` and fill the values — every variable is documented there. All secrets live in Vercel env vars only. `CRON_SECRET` is required in production (the cron endpoint fails closed without it).

## Local Development

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```

## Database

Schema lives in `supabase/migrations/` (apply in filename order). Highlights:

- All writes to orders/payments/debt/stock go through SECURITY DEFINER RPCs that re-check roles in SQL; direct table writes are blocked by RLS + a profile-protection trigger
- Storage buckets (`product-images`, `order-photos`, `payment-slips`, `stock-photos`) are private with per-owner read policies
- Key RPCs: `create_order`, `approve_order_and_start_packing`, `reject_order`, `cancel_approved_order`, `ship_order_with_photo`, `update_order_status`, `submit_payment`, `approve_payment`, `reject_payment`, `admin_record_manual_payment`, `adjust_inventory`, `replace_price_tiers`, `admin_set_customer_price_lock`, `owner_adjust_customer_debt`, `owner_set_owner_flag`, `request_staff_access`, `admin_delete_product`

To push new migrations:

```bash
supabase link --project-ref euvzhzhwlcuyrmnxvzdx --yes
supabase db push --dry-run --yes
supabase db push --yes
```

## Bootstrap First Admin / Owner

See [docs/handover.md](docs/handover.md) — after the first person signs up, run one SQL statement in the Supabase SQL editor to promote them to admin (and optionally owner). Everyone after that is managed from `/admin/users`.

## LINE Integration

See [docs/line-oa-notes.md](docs/line-oa-notes.md). Summary: the webhook links the OA to ONE staff group (auto-links only while unlinked; unlink from admin settings to move); Vercel Cron hits `/api/cron/line-report` daily at 20:00 Bangkok and sends daily + weekly (Sun) + monthly (1st) flex reports in one message, hard-stopping at 195/200 of the free push quota. There are intentionally no per-order instant pushes.
