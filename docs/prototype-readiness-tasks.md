# Prototype Readiness Tasks

Updated: 2026-06-20

This file tracks the work still needed after the full audit. It separates the minimum work needed for a customer-playable prototype from the larger production hardening work.

## P0 - Must Do Before Customer Prototype

- [x] Seed realistic demo products, inventory, prices, units, and low-stock examples.
- [x] Add at least 1 approved customer demo account and 1 admin demo account.
- [x] Add customer delivery addresses for the demo customer so checkout can be tested immediately.
- [x] Add a visible payment QR or payment instruction area on the payment page.
- [x] Add product images or image upload support so the product list does not look empty/placeheld.
- [x] Fix mobile bottom navigation so customer users can easily reach Home, Products, Orders, Payment, Cart/Profile on a phone.
- [x] Make payment slip upload mobile/camera friendly: image capture hint, preview, clear retry, and helpful error text.
- [x] Make packed-order photo upload mobile/camera friendly for admin/factory staff.
- [ ] Test the full flow on a real mobile phone:
  - customer login
  - view products
  - add to cart
  - checkout
  - admin approve order
  - stock reserved/deducted
  - admin upload packed photo
  - admin move order to shipping
  - customer sees packed photo
  - customer submits slip
  - admin approves payment
  - customer debt decreases
- [ ] Test the same flow inside LINE in-app browser, not only Chrome/Safari.
- [ ] Confirm session behavior inside LINE browser after refresh, back navigation, and app relaunch.
- [x] Add a short Thai prototype note for users if using email/password temporarily instead of LINE Login.
- [ ] Check live Vercel logs and Supabase logs after the demo flow.

## P1 - Important Before Real Production

- [ ] Configure Supabase Custom OAuth provider `custom:line` with the real LINE channel credentials.
- [ ] Implement full LINE Login / LIFF account-linking flow.
- [ ] Verify LINE ID token server-side and map `line_user_id` automatically.
- [ ] Remove manual customer editing of `line_user_id`.
- [ ] Add LINE OA notification delivery worker for queued events in `line_notification_outbox`.
- [ ] Harden order photo storage policy so customers can only access photos for their own orders.
- [ ] Add `owner` role or clearly decide that `admin` is the top role.
- [ ] Add audit log table and write audit rows for important admin/customer actions.
- [ ] Add order status history table for customer/admin traceability.
- [ ] Align order statuses with the brief: use manual `completed` or document why `delivered` is used.
- [ ] Enforce valid order status transitions server-side instead of allowing jumps.
- [ ] Add shipping method snapshot such as Kerry / Grab / pickup / other.
- [ ] Add transaction date filter.
- [ ] Add print label view.
- [x] Add cleanup for orphan storage files if a post-upload RPC fails.
- [ ] Review Supabase security advisors around exposed `SECURITY DEFINER` RPC functions.
- [ ] Optimize RLS policies flagged by Supabase performance advisors.
- [ ] Add realistic end-to-end tests or a repeatable manual QA checklist.
- [ ] Add Realtime or polling refresh for stock/order/payment status if needed.

## Prototype Demo Script

1. Admin prepares products and stock.
2. Customer opens the app from LINE, signs in with the demo customer account, and lands on `/home`.
3. Customer browses `/products`, adds items to cart, and checks out.
4. Admin opens `/admin/orders`, approves the order, then uploads a packed photo and confirms it was shipped.
5. Customer opens the order detail and sees the packed photo.
6. Customer opens payment, uploads/takes a slip photo, and submits payment amount.
7. Admin approves the payment in `/admin/payments`.
8. Customer opens transactions and confirms debt is reduced.

## Notes

- For prototype only, email/password login is acceptable if the user is told it is temporary.
- For production, LINE Login is required because the target entry point is LINE.
- Camera/file upload must be tested on real iOS and Android devices inside LINE browser.
