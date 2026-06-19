# LINE OA Integration Notes

MVP architecture prepares LINE integration without sending live notifications yet.

## Prepared Data Points

- `profiles.line_user_id` stores the future LINE identity mapping.
- `app_settings.line_oa` stores integration mode flags.
- `line_notification_outbox` stores order/payment events queued by RPC functions.

## Future Implementation

1. Add LINE Login provider flow and persist `line_user_id` on the signed-in profile.
2. Add Supabase Edge Function or Vercel Cron worker to poll `line_notification_outbox`.
3. Send messages through LINE Official Account Messaging API.
4. Mark outbox rows as `sent`, `failed`, or `skipped`.
5. Add retry limits, error logging, and admin visibility in `/admin/settings`.

## Events Already Queued

- `order_submitted`
- `order_approved`
- `order_rejected`
- `order_status_changed`
- `payment_submitted`
- `payment_approved`
- `payment_rejected`
