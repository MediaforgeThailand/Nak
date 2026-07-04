import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { AdBadge, PageHead } from "@/components/nak/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getSalesOrders } from "@/lib/data/queries";
import { compactDate, money } from "@/lib/format";
import {
  addDays,
  bkkDateKey,
  bkkStartOfDayISO,
  dailySeries,
  dayKeysBetween,
  isDateKey,
  moneyCompact,
  summarize,
  topProducts,
  type SalesOrder,
} from "@/lib/sales";

export const dynamic = "force-dynamic";

const WEEKDAY_TH = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

function weekdayLabel(dayKey: string) {
  // Midday Bangkok converted to UTC stays on the same calendar date, so
  // getUTCDay() gives the Bangkok weekday regardless of the server timezone.
  return WEEKDAY_TH[new Date(`${dayKey}T12:00:00+07:00`).getUTCDay()];
}

function StatRow({
  icon,
  label,
  sub,
  summary,
  last,
}: {
  icon: string;
  label: string;
  sub: string;
  summary: { total: number; orders: number; pieces: number };
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: "var(--p-soft)",
          color: "var(--p-deep)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} stroke={2.2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          {sub} · {summary.orders.toLocaleString("th-TH")} ออเดอร์ · {summary.pieces.toLocaleString("th-TH")} ชิ้น
        </div>
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>
        {money(summary.total)}
      </span>
    </div>
  );
}

export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  await requireAdmin();

  const today = bkkDateKey();
  const monthStart = `${today.slice(0, 8)}01`;
  const weekStart = addDays(today, -6);

  // Selected filter range (defaults to the last 7 days), clamped to <= 1 year.
  let rangeTo = isDateKey(params.to) ? params.to : today;
  let rangeFrom = isDateKey(params.from) ? params.from : weekStart;
  if (rangeFrom > rangeTo) [rangeFrom, rangeTo] = [rangeTo, rangeFrom];
  if (dayKeysBetween(rangeFrom, rangeTo).length >= 366) rangeFrom = addDays(rangeTo, -365);
  const isDefaultRange = rangeFrom === weekStart && rangeTo === today;

  // One fetch covers the fixed cards and the selected range.
  const since = [rangeFrom, monthStart, weekStart].sort()[0];
  const orders = (await getSalesOrders(bkkStartOfDayISO(since))) as unknown as SalesOrder[];

  const todaySum = summarize(orders, today, today);
  const weekSum = summarize(orders, weekStart, today);
  const monthSum = summarize(orders, monthStart, today);
  const rangeSum = summarize(orders, rangeFrom, rangeTo);
  const series = dailySeries(orders, rangeFrom, rangeTo);
  const top = topProducts(orders, rangeFrom, rangeTo, 5);
  const maxDay = Math.max(...series.map((point) => point.total), 1);
  const scrollChart = series.length > 14;

  const presets = [
    { label: "7 วัน", from: weekStart, to: today },
    { label: "14 วัน", from: addDays(today, -13), to: today },
    { label: "เดือนนี้", from: monthStart, to: today },
    { label: "30 วัน", from: addDays(today, -29), to: today },
  ];

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="ยอดขาย" sub="อิงออเดอร์ที่อนุมัติแล้ว (เวลาไทย)" />

      {/* fixed windows */}
      <div className="ad-card" style={{ padding: "4px 16px" }}>
        <StatRow icon="wallet" label="วันนี้" sub={compactDate(today)} summary={todaySum} />
        <StatRow icon="trending" label="7 วันล่าสุด" sub={`${compactDate(weekStart)} – ${compactDate(today)}`} summary={weekSum} />
        <StatRow icon="receipt" label="เดือนนี้" sub={`1 ${new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "Asia/Bangkok" }).format(new Date())} – วันนี้`} summary={monthSum} last />
      </div>

      {/* range filter */}
      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="filter" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>เลือกช่วงเวลา</h3>
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {presets.map((preset) => {
            const on = preset.from === rangeFrom && preset.to === rangeTo;
            return (
              <Link
                key={preset.label}
                href={`/admin/sales?from=${preset.from}&to=${preset.to}`}
                className="nak-chip"
                style={
                  on
                    ? { background: "var(--p)", color: "#fff", borderColor: "var(--p)", padding: "8px 14px" }
                    : { padding: "8px 14px" }
                }
              >
                {preset.label}
              </Link>
            );
          })}
        </div>
        <form action="/admin/sales" method="get" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>ตั้งแต่วันที่</span>
            <input className="ad-input" type="date" name="from" defaultValue={rangeFrom} max={today} required />
          </label>
          <label style={{ display: "grid", gap: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>ถึงวันที่</span>
            <input className="ad-input" type="date" name="to" defaultValue={rangeTo} max={today} required />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <SubmitButton variant="secondary" pendingLabel="กำลังโหลด..." className="w-full">
              ดูยอดขายช่วงนี้
            </SubmitButton>
          </div>
        </form>
      </div>

      {/* selected range summary + chart */}
      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              {isDefaultRange ? "ยอดขาย 7 วันล่าสุด" : "ยอดขายช่วงที่เลือก"}
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "var(--muted)" }}>
              {compactDate(rangeFrom)} – {compactDate(rangeTo)} · {rangeSum.orders.toLocaleString("th-TH")} ออเดอร์ ·{" "}
              {rangeSum.pieces.toLocaleString("th-TH")} ชิ้น
            </p>
          </div>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>
            {money(rangeSum.total)}
          </span>
        </div>

        {rangeSum.orders === 0 ? (
          <div style={{ padding: "18px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            ยังไม่มียอดขายในช่วงนี้
          </div>
        ) : (
          <div style={{ overflowX: scrollChart ? "auto" : "visible", paddingBottom: 2 }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 132,
                minWidth: scrollChart ? series.length * 26 : undefined,
              }}
            >
              {series.map((point) => {
                const height = point.total > 0 ? Math.max(Math.round((point.total / maxDay) * 92), 6) : 3;
                const isToday = point.day === today;
                return (
                  <div
                    key={point.day}
                    style={{ flex: scrollChart ? "0 0 22px" : 1, display: "grid", gap: 4, justifyItems: "center", alignContent: "end", minWidth: 0 }}
                    title={`${compactDate(point.day)} · ${money(point.total)} · ${point.orders} ออเดอร์`}
                  >
                    <span style={{ fontSize: 8.5, fontWeight: 700, color: point.total > 0 ? "var(--p-deep)" : "transparent", whiteSpace: "nowrap" }}>
                      {moneyCompact(point.total)}
                    </span>
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 26,
                        height,
                        borderRadius: 5,
                        background: point.total > 0 ? "linear-gradient(180deg, var(--p), #f2755f)" : "var(--chip)",
                        boxShadow: point.total > 0 ? "0 3px 8px -3px var(--p)" : "none",
                        outline: isToday ? "2px solid var(--p-soft)" : "none",
                      }}
                    />
                    <span style={{ fontSize: 8.5, color: isToday ? "var(--p)" : "var(--muted)", fontWeight: isToday ? 800 : 500, whiteSpace: "nowrap" }}>
                      {series.length > 9 ? Number(point.day.slice(8, 10)) : `${weekdayLabel(point.day)} ${Number(point.day.slice(8, 10))}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* top products in range */}
      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="star" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>Top 5 สินค้าขายดี</h3>
          <AdBadge tone="neutral">{compactDate(rangeFrom)} – {compactDate(rangeTo)}</AdBadge>
        </div>
        {top.length === 0 ? (
          <p style={{ margin: "6px 0", fontSize: 13, color: "var(--muted)" }}>ยังไม่มีข้อมูลในช่วงนี้</p>
        ) : (
          top.map((product, i) => (
            <div
              key={product.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 0",
                borderBottom: i < top.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  flexShrink: 0,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12.5,
                  fontWeight: 800,
                  background: i === 0 ? "var(--p)" : i === 1 ? "var(--p-soft)" : "var(--chip)",
                  color: i === 0 ? "#fff" : i === 1 ? "var(--p-deep)" : "var(--muted)",
                }}
              >
                {i + 1}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {product.quantity.toLocaleString("th-TH")} {product.unit}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap" }}>{money(product.revenue)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
