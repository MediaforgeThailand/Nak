import { getLinkedGroupId, getLineToken, lineServiceClient, pushLineText } from "@/lib/line";
import type { SupabaseClient } from "@supabase/supabase-js";

// Events worth alerting the staff group about (action-needed). Everything else
// (customer-facing status updates) is drained as "skipped" so the outbox doesn't
// grow unbounded.
const GROUP_EVENTS = new Set(["order_submitted", "payment_submitted"]);
const MAX_ATTEMPTS = 5;
const BATCH = 20;

type OutboxRow = {
  id: string;
  event_type: string;
  order_id: string | null;
  payment_id: string | null;
  attempts: number;
};

function baht(value: unknown) {
  return `฿${Number(value ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function customerName(row: { company_name?: string | null; full_name?: string | null; email?: string | null } | null) {
  return row?.company_name || row?.full_name || row?.email || "ลูกค้า";
}

async function buildMessage(client: SupabaseClient, row: OutboxRow, siteUrl: string): Promise<string | null> {
  if (row.event_type === "order_submitted" && row.order_id) {
    const { data } = await client
      .from("orders")
      .select("order_number, subtotal, customer:profiles!orders_customer_id_fkey(company_name, full_name, email)")
      .eq("id", row.order_id)
      .maybeSingle();
    if (!data) return null;
    const cust = Array.isArray(data.customer) ? data.customer[0] : data.customer;
    return [
      "🛒 ออเดอร์ใหม่รอตรวจสอบ",
      `เลขที่: ${data.order_number ?? "-"}`,
      `ลูกค้า: ${customerName(cust)}`,
      `ยอด: ${baht(data.subtotal)}`,
      siteUrl ? `ดูในระบบ: ${siteUrl}/admin/orders` : "",
    ].filter(Boolean).join("\n");
  }

  if (row.event_type === "payment_submitted" && row.payment_id) {
    const { data } = await client
      .from("payments")
      .select("payment_number, amount, customer:profiles!payments_customer_id_fkey(company_name, full_name, email)")
      .eq("id", row.payment_id)
      .maybeSingle();
    if (!data) return null;
    const cust = Array.isArray(data.customer) ? data.customer[0] : data.customer;
    return [
      "💰 มีสลิปใหม่รอตรวจสอบ",
      `เลขที่: ${data.payment_number ?? "-"}`,
      `ลูกค้า: ${customerName(cust)}`,
      `ยอด: ${baht(data.amount)}`,
      siteUrl ? `ตรวจสลิป: ${siteUrl}/admin/payments` : "",
    ].filter(Boolean).join("\n");
  }

  return null;
}

/**
 * Drain the LINE notification outbox to the linked staff group.
 * Safe to call inline (after an order/payment) or from a cron backstop; guarded
 * so it never throws into the caller.
 */
export async function deliverLineOutbox(): Promise<{ sent: number; failed: number; skipped: number; note?: string }> {
  const result = { sent: 0, failed: 0, skipped: 0 };
  try {
    const client = lineServiceClient();
    if (!client) return { ...result, note: "no service role key" };
    if (!getLineToken()) return { ...result, note: "no LINE token" };

    const groupId = await getLinkedGroupId(client);

    const { data: rows } = await client
      .from("line_notification_outbox")
      .select("id, event_type, order_id, payment_id, attempts")
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(BATCH);

    if (!rows || rows.length === 0) return { ...result, note: "nothing queued" };

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

    for (const row of rows as OutboxRow[]) {
      // Non-group events are drained so the table stays small.
      if (!GROUP_EVENTS.has(row.event_type)) {
        await client
          .from("line_notification_outbox")
          .update({ status: "skipped", processed_at: new Date().toISOString() })
          .eq("id", row.id);
        result.skipped += 1;
        continue;
      }

      // No group linked yet → leave queued until it is.
      if (!groupId) continue;

      const message = await buildMessage(client, row, siteUrl);
      if (!message) {
        await client
          .from("line_notification_outbox")
          .update({ status: "skipped", processed_at: new Date().toISOString(), last_error: "missing source record" })
          .eq("id", row.id);
        result.skipped += 1;
        continue;
      }

      const push = await pushLineText(groupId, message);
      if (push.ok) {
        await client
          .from("line_notification_outbox")
          .update({ status: "sent", processed_at: new Date().toISOString() })
          .eq("id", row.id);
        result.sent += 1;
      } else {
        const attempts = (row.attempts ?? 0) + 1;
        await client
          .from("line_notification_outbox")
          .update({
            status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
            attempts,
            last_error: push.error ?? "push failed",
          })
          .eq("id", row.id);
        result.failed += 1;
      }
    }

    return result;
  } catch (err) {
    return { ...result, note: err instanceof Error ? err.message : "delivery error" };
  }
}
