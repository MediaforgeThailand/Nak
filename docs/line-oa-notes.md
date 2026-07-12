# LINE OA Integration Notes

Updated: 2026-07-12 — describes the SHIPPED integration (the old "future outbox
worker" plan in earlier versions of this doc was superseded).

## What is live

1. **LINE Login, two paths**
   - Inside the LINE app: LIFF auto-login (`src/components/line/liff-auto-login.tsx`) exchanges the LIFF id_token at `POST /api/auth/line-liff`, which verifies it against LINE's verify API, creates/reuses the Supabase user, and persists `profiles.line_user_id` automatically.
   - On the web: Supabase Custom OAuth provider `custom:line` (`signInWithLineAction` → `/auth/callback`).
2. **Staff-group webhook** — `POST /api/line/webhook` (signature-verified). Links the OA to ONE staff group: it auto-links only while no group is linked; activity in other groups never steals the link. Unlink from `/admin/settings` to move groups. Leave events unlink automatically.
3. **Scheduled flex reports** — Vercel Cron hits `GET /api/cron/line-report` daily at 13:00 UTC (20:00 Bangkok, guarded by `CRON_SECRET`, fails closed in production). One flex message per run: daily report + weekly summary (Sundays) + monthly summary (the 1st) bundled into a single carousel. Per-Bangkok-day dedupe in `app_settings.line_report_state`; hard quota stop at 195/200 free-plan pushes (checked against LINE's own quota API). Sales figures use the agreed definition: approved orders by `debt_applied_at`, Bangkok days.
4. **Admin settings page** — link status, masked group id, live quota, test-send buttons (daily/weekly/monthly, don't disturb the schedule), unlink button.

## Deliberate design decisions

- **No per-event push.** The `line_notification_outbox` table still receives rows from the RPCs (7 event types) but the nightly job drains them as `status='skipped'`. Real-time per-order alerts were removed (commit 511635b) to stay far under the 200-message/month free quota. If the customer later wants instant alerts: upgrade the OA plan, then send from the outbox instead of skipping it — the data path is already in place.
- **No per-customer messages.** `profiles.line_user_id` is captured for the future but nothing pushes to customers yet.

## Manual testing

- `/admin/settings` test buttons, or `GET /api/cron/line-report?force=daily&preview=1` with the `Authorization: Bearer <CRON_SECRET>` header — `preview=1` sends without touching the dedupe state.

## Required configuration

See `docs/handover.md` §2–3 (env vars + LINE console setup).
