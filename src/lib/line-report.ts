import type { SupabaseClient } from "@supabase/supabase-js";
import { getLineQuota, getLinkedGroupId, lineServiceClient, pushLineFlex } from "@/lib/line";

// Scheduled LINE reports for the staff group, designed around the free OA plan:
// stay well under the 200 push-messages/month quota. One cron run per day sends
// ONE flex message (daily report; Sundays and the 1st bundle weekly/monthly
// bubbles into the same message as a carousel, so a bundle still costs 1).

const BKK_OFFSET_MS = 7 * 3600 * 1000; // Asia/Bangkok is UTC+7, no DST
const QUOTA_HARD_STOP = 195; // leave headroom under the free 200/month

const THEME = {
  red: "#e5404f",
  redDeep: "#b32a3c",
  ink: "#28161b",
  muted: "#8c636c",
  line: "#f3d7dc",
  soft: "#fdf2f4",
  green: "#1b7a4b",
  amber: "#a35a10",
};

type BkkDate = { y: number; m: number; d: number; dow: number };

/** Bangkok calendar date parts for a UTC instant. */
export function bkkDate(at: Date = new Date()): BkkDate {
  const t = new Date(at.getTime() + BKK_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), dow: t.getUTCDay() };
}

/** UTC instant for Bangkok-local midnight of (y, m, d). */
function bkkMidnightUTC(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d) - BKK_OFFSET_MS);
}

export function bkkDayRange(at: Date = new Date()) {
  const { y, m, d } = bkkDate(at);
  return { start: bkkMidnightUTC(y, m, d), end: bkkMidnightUTC(y, m, d + 1) };
}

/** Monday..Sunday Bangkok week containing `at`. */
export function bkkWeekRange(at: Date = new Date()) {
  const { y, m, d, dow } = bkkDate(at);
  const sinceMonday = (dow + 6) % 7;
  return { start: bkkMidnightUTC(y, m, d - sinceMonday), end: bkkMidnightUTC(y, m, d - sinceMonday + 7) };
}

/** The Bangkok calendar month containing `at`, shifted by `offset` months. */
export function bkkMonthRange(at: Date = new Date(), offset = 0) {
  const { y, m } = bkkDate(at);
  return { start: bkkMidnightUTC(y, m + offset, 1), end: bkkMidnightUTC(y, m + offset + 1, 1) };
}

function thaiDate(at: Date) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(at);
}

function thaiMonth(at: Date) {
  return new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(at);
}

function baht(n: number) {
  return `฿${Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

const ACTIVE = "status.not.in.(rejected,cancelled)"; // documented intent; applied via .not below

// ── data gathering ─────────────────────────────────────────────────────────

export type DailyStats = {
  dateLabel: string;
  salesCount: number;
  salesValue: number;
  ordersCount: number;
  ordersValue: number;
  shippedCount: number;
  shippedValue: number;
  paidCount: number;
  paidValue: number;
  paidNames: string[];
  pendingSlips: number;
};

export async function gatherDaily(client: SupabaseClient, at = new Date()): Promise<DailyStats> {
  const { start, end } = bkkDayRange(at);
  const [salesRes, ordersRes, shippedRes, paidRes, pendingRes] = await Promise.all([
    // "ยอดขาย" = approved orders by debt_applied_at — the exact same definition
    // as the /admin/sales dashboard (getSalesOrders), so the numbers match.
    client
      .from("orders")
      .select("subtotal")
      .not("debt_applied_at", "is", null)
      .gte("debt_applied_at", start.toISOString())
      .lt("debt_applied_at", end.toISOString())
      .not("status", "in", "(rejected,cancelled)"),
    client
      .from("orders")
      .select("subtotal")
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .not("status", "in", "(rejected,cancelled)"),
    // Proxy for "shipped today": now in a shipped-ish status and last touched today.
    client
      .from("orders")
      .select("subtotal")
      .in("status", ["shipping", "delivered"])
      .gte("updated_at", start.toISOString())
      .lt("updated_at", end.toISOString()),
    client
      .from("payments")
      .select("amount, customer:profiles!payments_customer_id_fkey(company_name, full_name, email)")
      .eq("status", "approved")
      .gte("reviewed_at", start.toISOString())
      .lt("reviewed_at", end.toISOString()),
    client.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const sales = salesRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const shipped = shippedRes.data ?? [];
  const paid = paidRes.data ?? [];

  return {
    dateLabel: thaiDate(at),
    salesCount: sales.length,
    salesValue: sales.reduce((s, o) => s + Number(o.subtotal ?? 0), 0),
    ordersCount: orders.length,
    ordersValue: orders.reduce((s, o) => s + Number(o.subtotal ?? 0), 0),
    shippedCount: shipped.length,
    shippedValue: shipped.reduce((s, o) => s + Number(o.subtotal ?? 0), 0),
    paidCount: paid.length,
    paidValue: paid.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    paidNames: paid.map((p) => {
      const c = Array.isArray(p.customer) ? p.customer[0] : p.customer;
      const name = c?.company_name || c?.full_name || c?.email || "ลูกค้า";
      return `${name} · ${baht(Number(p.amount ?? 0))}`;
    }),
    pendingSlips: pendingRes.count ?? 0,
  };
}

export type PeriodStats = {
  title: string;
  rangeLabel: string;
  salesCount: number;
  salesValue: number;
  paidValue: number;
  paidCount: number;
  outstandingDebt: number;
  topCategories: { name: string; value: number }[];
};

export async function gatherPeriod(
  client: SupabaseClient,
  kind: "weekly" | "monthly",
  at = new Date(),
): Promise<PeriodStats> {
  const range = kind === "weekly" ? bkkWeekRange(at) : bkkMonthRange(at, -1);
  const { start, end } = range;

  const [salesRes, paidRes, debtRes, itemsRes] = await Promise.all([
    // Same "approved sale" definition as the /admin/sales dashboard.
    client
      .from("orders")
      .select("subtotal")
      .not("debt_applied_at", "is", null)
      .gte("debt_applied_at", start.toISOString())
      .lt("debt_applied_at", end.toISOString())
      .not("status", "in", "(rejected,cancelled)"),
    client
      .from("payments")
      .select("amount")
      .eq("status", "approved")
      .gte("reviewed_at", start.toISOString())
      .lt("reviewed_at", end.toISOString()),
    client.from("profiles").select("debt_balance").eq("role", "customer").gt("debt_balance", 0),
    client
      .from("order_items")
      .select("line_total, order:orders!inner(debt_applied_at, status), product:products(category:product_categories(name))")
      .not("order.debt_applied_at", "is", null)
      .gte("order.debt_applied_at", start.toISOString())
      .lt("order.debt_applied_at", end.toISOString())
      .not("order.status", "in", "(rejected,cancelled)"),
  ]);

  void ACTIVE;

  const byCategory = new Map<string, number>();
  for (const row of itemsRes.data ?? []) {
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    const category = product ? (Array.isArray(product.category) ? product.category[0] : product.category) : null;
    const name = category?.name || "ไม่ระบุหมวด";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(row.line_total ?? 0));
  }

  const sales = salesRes.data ?? [];
  const paid = paidRes.data ?? [];
  const endLabel = new Date(end.getTime() - 1);

  return {
    title: kind === "weekly" ? "รายงานประจำสัปดาห์" : "รายงานประจำเดือน",
    rangeLabel:
      kind === "weekly" ? `${thaiDate(start)} – ${thaiDate(endLabel)}` : thaiMonth(start),
    salesCount: sales.length,
    salesValue: sales.reduce((s, o) => s + Number(o.subtotal ?? 0), 0),
    paidCount: paid.length,
    paidValue: paid.reduce((s, p) => s + Number(p.amount ?? 0), 0),
    outstandingDebt: (debtRes.data ?? []).reduce((s, p) => s + Number(p.debt_balance ?? 0), 0),
    topCategories: [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5),
  };
}

// ── flex bubbles ───────────────────────────────────────────────────────────

// Label carries the counts ("ยอดขาย · 13 ออเดอร์") so the value column only
// holds money and 7-8 digit totals never truncate; wrap is the safety net.
function statRow(label: string, value: string, valueColor = THEME.ink) {
  return {
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: label, size: "sm", color: THEME.muted, flex: 5, wrap: true },
      { type: "text", text: value, size: "sm", color: valueColor, align: "end", weight: "bold", flex: 4, wrap: true },
    ],
  };
}

function sectionTitle(text: string) {
  return { type: "text", text, size: "xs", color: THEME.red, weight: "bold", margin: "lg" };
}

function separator() {
  return { type: "separator", margin: "md", color: THEME.line };
}

function bubbleShell(title: string, subtitle: string, bodyContents: unknown[]) {
  return {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: THEME.red,
      paddingAll: "16px",
      contents: [
        { type: "text", text: "NAK Wholesale", size: "xxs", color: "#ffd7db", weight: "bold" },
        { type: "text", text: title, size: "lg", color: "#ffffff", weight: "bold", margin: "xs" },
        { type: "text", text: subtitle, size: "xs", color: "#ffe4e7", margin: "xs" },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "16px",
      backgroundColor: "#ffffff",
      contents: bodyContents,
    },
  };
}

export function buildDailyBubble(s: DailyStats) {
  const names = s.paidNames.slice(0, 6).map((line) => ({
    type: "text",
    text: `• ${line}`,
    size: "xs",
    color: THEME.muted,
    margin: "sm",
    wrap: true,
  }));
  if (s.paidNames.length > 6) {
    names.push({
      type: "text",
      text: `…และอีก ${s.paidNames.length - 6} ราย`,
      size: "xs",
      color: THEME.muted,
      margin: "sm",
      wrap: true,
    });
  }
  return bubbleShell("📊 รายงานประจำวัน", s.dateLabel, [
    sectionTitle("ยอดขายวันนี้ (อนุมัติแล้ว)"),
    statRow(`ยอดขาย · ${s.salesCount} ออเดอร์`, baht(s.salesValue), THEME.redDeep),
    separator(),
    sectionTitle("ออเดอร์วันนี้"),
    statRow(`สั่งเข้ามา · ${s.ordersCount} ออเดอร์`, baht(s.ordersValue)),
    statRow(`จัดส่งแล้ว · ${s.shippedCount} ออเดอร์`, baht(s.shippedValue), THEME.green),
    separator(),
    sectionTitle("การชำระเงินวันนี้"),
    statRow(`รับชำระ (อนุมัติ) · ${s.paidCount} ราย`, baht(s.paidValue), THEME.green),
    ...(names.length > 0 ? names : []),
    statRow("สลิปรอตรวจ", `${s.pendingSlips} รายการ`, s.pendingSlips > 0 ? THEME.amber : THEME.ink),
  ]);
}

export function buildPeriodBubble(s: PeriodStats) {
  const top = s.topCategories.length
    ? s.topCategories.map((c, i) =>
        statRow(`${i + 1}. ${c.name}`, baht(c.value), i === 0 ? THEME.redDeep : THEME.ink),
      )
    : [{ type: "text", text: "ยังไม่มียอดขายในช่วงนี้", size: "xs", color: THEME.muted, margin: "sm" }];
  return bubbleShell(`📈 ${s.title}`, s.rangeLabel, [
    sectionTitle("ภาพรวม"),
    statRow(`ยอดขาย · ${s.salesCount} ออเดอร์`, baht(s.salesValue), THEME.redDeep),
    statRow(`รับชำระ (อนุมัติ) · ${s.paidCount} ราย`, baht(s.paidValue), THEME.green),
    statRow("ยอดค้างชำระรวม", baht(s.outstandingDebt), s.outstandingDebt > 0 ? THEME.amber : THEME.green),
    separator(),
    sectionTitle("Top 5 หมวดขายดี"),
    ...top,
  ]);
}

// ── orchestration ──────────────────────────────────────────────────────────

const STATE_KEY = "line_report_state";

type ReportState = { last_daily?: string; last_weekly?: string; last_monthly?: string };

async function getState(client: SupabaseClient): Promise<ReportState> {
  const { data } = await client.from("app_settings").select("value").eq("key", STATE_KEY).maybeSingle<{ value: ReportState }>();
  return data?.value ?? {};
}

async function saveState(client: SupabaseClient, state: ReportState) {
  await client.from("app_settings").upsert(
    { key: STATE_KEY, value: state, description: "Last-sent markers for scheduled LINE reports", updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
}

function dayKey(at: Date) {
  const { y, m, d } = bkkDate(at);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthKey(at: Date, offset = 0) {
  const { y, m } = bkkDate(at);
  const t = new Date(Date.UTC(y, m + offset, 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Send today's scheduled reports as ONE flex message (carousel when several are
 * due). Dedupes per Bangkok day and hard-stops before the free LINE quota.
 * `force` skips the dedupe (for a manual test) but never the quota guard.
 * `preview` (with `force`) sends ONLY the forced kinds and leaves all state
 * untouched — the scheduled sends still go out as if the preview never happened.
 */
export async function sendScheduledReports(
  opts: { force?: ("daily" | "weekly" | "monthly")[]; preview?: boolean } = {},
) {
  const client = lineServiceClient();
  if (!client) return { sent: false, note: "no service role key" };

  const groupId = await getLinkedGroupId(client);
  if (!groupId) return { sent: false, note: "group not linked" };

  const quota = await getLineQuota();
  if (!quota) return { sent: false, note: "quota check failed — not sending" };
  const limit = Math.min(quota.limit ?? QUOTA_HARD_STOP, QUOTA_HARD_STOP);
  if (quota.used >= limit) return { sent: false, note: `quota reached (${quota.used}/${limit})` };

  const now = new Date();
  const { dow, d } = bkkDate(now);
  const state = await getState(client);
  const force = new Set(opts.force ?? []);
  const preview = opts.preview === true && force.size > 0;

  const wantDaily = force.has("daily") || (!preview && state.last_daily !== dayKey(now));
  const wantWeekly = force.has("weekly") || (!preview && dow === 0 && state.last_weekly !== dayKey(now));
  const wantMonthly = force.has("monthly") || (!preview && d === 1 && state.last_monthly !== monthKey(now, -1));

  // Drain the per-event outbox as skipped: reports replaced per-order pushes.
  if (!preview) {
    await client
      .from("line_notification_outbox")
      .update({ status: "skipped", processed_at: now.toISOString() })
      .eq("status", "queued");
  }

  if (!wantDaily && !wantWeekly && !wantMonthly) return { sent: false, note: "nothing due" };

  const bubbles: unknown[] = [];
  if (wantDaily) bubbles.push(buildDailyBubble(await gatherDaily(client, now)));
  if (wantWeekly) bubbles.push(buildPeriodBubble(await gatherPeriod(client, "weekly", now)));
  if (wantMonthly) bubbles.push(buildPeriodBubble(await gatherPeriod(client, "monthly", now)));

  const contents = bubbles.length === 1 ? bubbles[0] : { type: "carousel", contents: bubbles };
  const push = await pushLineFlex(groupId, "รายงาน NAK Wholesale", contents);
  if (!push.ok) return { sent: false, note: push.error };

  if (!preview) {
    const next: ReportState = { ...state };
    if (wantDaily) next.last_daily = dayKey(now);
    if (wantWeekly) next.last_weekly = dayKey(now);
    if (wantMonthly) next.last_monthly = monthKey(now, -1);
    await saveState(client, next);
  }

  return { sent: true, bubbles: bubbles.length, preview, quotaUsedBefore: quota.used, limit };
}
