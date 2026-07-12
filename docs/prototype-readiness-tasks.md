# Prototype Readiness Tasks

Updated: 2026-07-12 (verified against code during the delivery audit; see docs/handover.md for the live pre-delivery checklist)

## P0 - Must Do Before Customer Prototype

- [x] Seed realistic demo products, inventory, prices, units, and low-stock examples. (Superseded: real 179-SKU catalog seeded, demo catalog purged — 202607110001/202607110002)
- [x] Add at least 1 approved customer demo account and 1 admin demo account. (Remember to suspend demo accounts before handover — handover.md §6)
- [x] Add customer delivery addresses for the demo customer so checkout can be tested immediately.
- [x] Add a visible payment QR or payment instruction area on the payment page. (Now a REAL PromptPay QR generated from admin settings; fake QR removed 2026-07-12)
- [x] Add product images or image upload support so the product list does not look empty/placeheld.
- [x] Fix mobile bottom navigation so customer users can easily reach Home, Products, Orders, Payment, Cart/Profile on a phone.
- [x] Make payment slip upload mobile/camera friendly: image capture hint, preview, clear retry, and helpful error text.
- [x] Make packed-order photo upload mobile/camera friendly for admin/factory staff.
- [ ] Test the full flow on a real mobile phone (login → products → cart → checkout → approve → stock → packed photo → shipping → slip → payment approval → debt). **Live-device task — repeat after the 2026-07-12 changes.**
- [ ] Test the same flow inside LINE in-app browser, not only Chrome/Safari.
- [ ] Confirm session behavior inside LINE browser after refresh, back navigation, and app relaunch. (Session refresh now handled in proxy.ts — still needs a device test.)
- [x] Add a short Thai prototype note for users if using email/password temporarily instead of LINE Login. (LINE Login is fully live now.)
- [ ] Check live Vercel logs and Supabase logs after the demo flow.

## P1 - Important Before Real Production

- [x] Configure Supabase Custom OAuth provider `custom:line` (code side complete; dashboard credentials confirmed live via LINE-login usage)
- [x] Implement full LINE Login / LIFF account-linking flow.
- [x] Verify LINE ID token server-side and map `line_user_id` automatically.
- [x] Remove manual customer editing of `line_user_id`. (Form field AND the server-action escape hatch removed 2026-07-12.)
- [x] LINE OA delivery worker. (Design changed: scheduled daily/weekly/monthly flex reports via cron replace per-event outbox delivery — see docs/line-oa-notes.md.)
- [x] Harden order photo storage policy (202606270001).
- [x] Add `owner` role. (is_owner flag + owner_set_owner_flag RPC + transfer UI in /admin/users.)
- [ ] Add audit log table and write audit rows for important admin/customer actions. (Deferred — ledger + inventory_movements cover money/stock trails.)
- [ ] Add order status history table. (Deferred.)
- [x] Align order statuses with the brief. (Documented in handover.md §7: lifecycle ends at `shipping`; `delivered` label identical by design. `cancelled` now reachable via admin cancel.)
- [x] Enforce valid order status transitions server-side (202606270003).
- [x] Add shipping method snapshot (Flash/Grab, 202607020003).
- [ ] Add transaction date filter. (Sales report has one; customer /transactions list does not — deferred.)
- [ ] Add print label view. (Deliberately replaced with courier-handoff copy buttons; reopen only if the customer wants physical labels.)
- [x] Add cleanup for orphan storage files if a post-upload RPC fails.
- [x] Review Supabase security advisors around exposed `SECURITY DEFINER` RPC functions. (Code-side revokes complete; re-run live advisors after MCP/dashboard access — handover.md §6.)
- [ ] Optimize RLS policies flagged by Supabase performance advisors. (Deferred — initplan wrapping; no user-visible impact at current scale.)
- [ ] Add realistic end-to-end tests or a repeatable manual QA checklist. (Manual checklist now in handover.md §6; automated tests deferred.)
- [ ] Add Realtime or polling refresh for stock/order/payment status if needed. (Deferred — pages are force-dynamic; fresh on navigation.)

## Added 2026-07-12 (delivery hardening)

- [x] Real PromptPay QR + admin-configurable payment account
- [x] Post-approval order cancellation (stock + debt reversal)
- [x] signup_scope self-escalation closed (trigger + request_staff_access RPC)
- [x] Owner-rights transfer from the app
- [x] Atomic price-ladder replacement (replace_price_tiers)
- [x] slip_path ownership check in submit_payment
- [x] customer_addresses per-command policies (staff can no longer delete customer addresses)
- [x] Thai error mapping for all RPC errors; error.tsx/not-found.tsx; address edit/delete UI; session refresh in proxy; webhook group lock; CRON_SECRET fails closed; factory_staff no longer sees silent admin-only buttons
