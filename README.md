# Nak Inventory Credit System

Mobile-first MVP for inventory, customer ordering, credit/debt tracking, transfer slip verification, packed order photo uploads, and admin order management.

## Stack

- Frontend: Next.js App Router, Tailwind CSS, deployed on Vercel
- Backend: Supabase Auth, Postgres, Storage, RLS, RPC functions
- Repository: GitHub

## Current MVP Scope

- Customers sign up, then wait for admin approval before using the app.
- Approved customers browse products, add items to cart, and submit orders.
- Stock is deducted immediately by the `create_order` RPC when the order is submitted.
- Admins can approve or reject pending orders.
- Rejected orders restore stock by RPC.
- Approved orders increase customer debt by RPC.
- Customers submit payments later by uploading a transfer slip and amount.
- Admins manually verify payment slips before debt is reduced.
- Factory staff/admins can upload packed product photos before shipping.
- Customers can view order status, packed photos, debt balance, payment history, and transactions.
- LINE Login/OA notifications are prepared through schema fields and `line_notification_outbox`, but delivery is stubbed for MVP.

## Environment

Copy `.env.example` to `.env.local` and fill values in Vercel/local env vars:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://euvzhzhwlcuyrmnxvzdx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Do not commit `.env.local` or service-role secrets.

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

## Database

The main schema is in:

```text
supabase/migrations/202606200001_initial_inventory_credit_system.sql
```

It creates:

- Core tables: profiles, addresses, categories, products, inventory, orders, order items, order photos, payments, account transactions, inventory movements, role permissions, settings, LINE notification outbox
- Storage buckets: `product-images`, `order-photos`, `payment-slips`
- RLS policies for customers, factory staff, and admins
- RPC flows: `create_order`, `approve_order`, `reject_order`, `update_order_status`, `upload_order_photo`, `submit_payment`, `approve_payment`, `reject_payment`, `adjust_inventory`, `approve_customer`, `suspend_customer`, `create_product_with_inventory`

The migration has already been applied to Supabase project `euvzhzhwlcuyrmnxvzdx`.

To push future migrations:

```bash
supabase link --project-ref euvzhzhwlcuyrmnxvzdx --yes
supabase db push --dry-run --yes
supabase db push --yes
```

## Bootstrap First Admin

After the first admin signs up, approve and promote them from Supabase SQL editor:

```sql
update public.profiles
set status = 'approved',
    role = 'admin',
    approved_at = now()
where email = 'admin@example.com';
```

After that, use `/admin/customers` to approve customers and staff from the app.

## Routes

Customer:

- `/login`
- `/pending`
- `/dashboard`
- `/products`
- `/cart`
- `/orders`
- `/orders/[id]`
- `/payments/new`
- `/transactions`
- `/profile`

Admin / staff:

- `/admin`
- `/admin/products`
- `/admin/stock`
- `/admin/orders`
- `/admin/payments`
- `/admin/customers`
- `/admin/users`
- `/admin/settings`

## Assumptions

- The attached `codex_inventory_credit_system_brief.md` was not present in the workspace or Codex attachments during implementation. The MVP follows the requirements supplied in the active goal text.
- MVP uses email/password Supabase Auth, with a customer LINE Login button wired to Supabase Custom OAuth (`custom:line`). Production still needs the LINE provider credentials configured in Supabase.
- Payment slip verification is manual; no OCR or bank API is included.
- Debt balance is reduced to zero if an approved payment exceeds the current debt. Overpayment carry-forward is a future enhancement.
- Product images are modeled through Supabase Storage, but the MVP product UI can operate without uploaded images.

## Future LINE OA Integration

See `docs/line-oa-notes.md`.
