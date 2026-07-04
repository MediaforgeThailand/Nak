import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { PageHead } from "@/components/nak/ui";
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

/** Compact for tiles: full baht under 10k, ฿12.5K / ฿1.2M above. */
function tileMoney(value: number) {
  return value < 10_000 ? money(value) : moneyCompact(value);
}

function DeltaChip({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)", borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontWeight: 700 }}>
        <Icon name="trending" size={12} stroke={2.6} /> ช่วงก่อนหน้าไม่มียอด
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: up ? "rgba(74, 222, 128, .22)" : "rgba(255,255,255,.16)",
        border: "1px solid rgba(255,255,255,.28)",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 11.5,
        fontWeight: 800,
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(pct).toLocaleString("th-TH")}% จากช่วงก่อนหน้า
    </span>
  );
}

function KpiTile({
  icon,
  label,
  value,
  sub,
  tone = "accent",
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  tone?: "accent" | "success" | "warning" | "neutral";
}) {
  const palette = {
    accent: { bg: "var(--p-soft)", fg: "var(--p-deep)" },
    success: { bg: "#e7f4ec", fg: "#1b7a4b" },
    warning: { bg: "#fbeedd", fg: "#a35a10" },
    neutral: { bg: "var(--chip)", fg: "var(--muted)" },
  }[tone];
  return (
    <div className="ad-card" style={{ padding: "13px 14px", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 28, height: 28, borderRadius: 9, background: palette.bg, color: palette.fg, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Icon name={icon} size={14} stroke={2.3} />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>{value}</div>
        <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{sub}</div>
      </div>
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

  // Previous period of identical length, immediately before the range.
  const rangeDays = dayKeysBetween(rangeFrom, rangeTo).length;
  const prevTo = addDays(rangeFrom, -1);
  const prevFrom = addDays(prevTo, -(rangeDays - 1));

  // One fetch covers every window (fixed cards, range, previous period).
  const since = [prevFrom, rangeFrom, monthStart, weekStart].sort()[0];
  const orders = (await getSalesOrders(bkkStartOfDayISO(since))) as unknown as SalesOrder[];

  const todaySum = summarize(orders, today, today);
  const weekSum = summarize(orders, weekStart, today);
  const monthSum = summarize(orders, monthStart, today);
  const rangeSum = summarize(orders, rangeFrom, rangeTo);
  const prevSum = summarize(orders, prevFrom, prevTo);
  const series = dailySeries(orders, rangeFrom, rangeTo);
  const top = topProducts(orders, rangeFrom, rangeTo, 5);

  const maxDay = Math.max(...series.map((point) => point.total), 1);
  const activeDays = series.filter((point) => point.total > 0);
  const peakDay = activeDays.length > 0 ? activeDays.reduce((a, b) => (b.total > a.total ? b : a)) : null;
  const avgPerDay = rangeSum.total / series.length;
  const avgPerOrder = rangeSum.orders > 0 ? rangeSum.total / rangeSum.orders : 0;
  const scrollChart = series.length > 14;
  const topMax = top.length > 0 ? Math.max(...top.map((p) => p.revenue)) : 1;

  const presets = [
    { label: "7 วัน", from: weekStart, to: today },
    { label: "14 วัน", from: addDays(today, -13), to: today },
    { label: "เดือนนี้", from: monthStart, to: today },
    { label: "30 วัน", from: addDays(today, -29), to: today },
    { label: "90 วัน", from: addDays(today, -89), to: today },
  ];
  const isPreset = presets.some((preset) => preset.from === rangeFrom && preset.to === rangeTo);

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="แดชบอร์ดยอดขาย" sub="ออเดอร์ที่อนุมัติแล้ว · เวลาไทย" />

      {/* period picker */}
      <div className="nak-chiprow" style={{ margin: "-2px 0" }}>
        {presets.map((preset) => {
          const on = preset.from === rangeFrom && preset.to === rangeTo;
          return (
            <Link key={preset.label} href={`/admin/sales?from=${preset.from}&to=${preset.to}`} className={"nak-chip" + (on ? " is-on" : "")}>
              {preset.label}
            </Link>
          );
        })}
      </div>

      <details className="ad-card" style={{ padding: "12px 16px" }} open={!isPreset}>
        <summary style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", listStyle: "none" }}>
          <Icon name="filter" size={15} stroke={2.2} style={{ color: "var(--p)" }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>กำหนดช่วงวันที่เอง</span>
          <Icon name="chevD" size={15} stroke={2.4} style={{ color: "var(--muted)" }} />
        </summary>
        <form action="/admin/sales" method="get" style={{ marginTop: 11, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
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
      </details>

      {/* hero: selected range */}
      <div className="nak-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg, var(--p-deep), var(--p))", color: "#fff", padding: "16px 16px 17px", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="wallet" size={14} stroke={2.2} /> ยอดขาย {compactDate(rangeFrom)} – {compactDate(rangeTo)}
            </span>
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>{money(rangeSum.total)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <DeltaChip current={rangeSum.total} previous={prevSum.total} />
            <span style={{ fontSize: 12, opacity: 0.88 }}>
              {rangeSum.orders.toLocaleString("th-TH")} ออเดอร์ · {rangeSum.pieces.toLocaleString("th-TH")} ชิ้น
            </span>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <KpiTile icon="wallet" label="วันนี้" value={tileMoney(todaySum.total)} sub={`${todaySum.orders.toLocaleString("th-TH")} ออเดอร์`} tone="accent" />
        <KpiTile icon="trending" label="7 วันล่าสุด" value={tileMoney(weekSum.total)} sub={`${weekSum.orders.toLocaleString("th-TH")} ออเดอร์`} tone="success" />
        <KpiTile icon="receipt" label="เดือนนี้ (1 – วันนี้)" value={tileMoney(monthSum.total)} sub={`${monthSum.orders.toLocaleString("th-TH")} ออเดอร์ · ${monthSum.pieces.toLocaleString("th-TH")} ชิ้น`} tone="warning" />
        <KpiTile icon="bag" label="เฉลี่ยต่อออเดอร์" value={tileMoney(avgPerOrder)} sub="ช่วงที่เลือก" tone="neutral" />
      </div>

      {/* daily chart */}
      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="dash" size={15} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, flex: 1 }}>ยอดขายรายวัน</h3>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{series.length} วัน</span>
        </div>

        {rangeSum.orders === 0 ? (
          <div style={{ padding: "22px 0", textAlign: "center", color: "var(--muted)", fontSize: 13, display: "grid", gap: 8, justifyItems: "center" }}>
            <Icon name="dash" size={28} stroke={1.6} style={{ opacity: 0.4 }} />
            ยังไม่มียอดขายในช่วงนี้
          </div>
        ) : (
          <>
            <div style={{ overflowX: scrollChart ? "auto" : "visible", paddingBottom: 2 }}>
              <div style={{ position: "relative", minWidth: scrollChart ? series.length * 26 : undefined }}>
                {/* average line */}
                {avgPerDay > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      bottom: 18 + Math.round((avgPerDay / maxDay) * 96),
                      borderTop: "1.5px dashed rgba(180, 35, 24, .35)",
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  />
                ) : null}
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 152 }}>
                  {series.map((point) => {
                    const height = point.total > 0 ? Math.max(Math.round((point.total / maxDay) * 96), 6) : 3;
                    const isToday = point.day === today;
                    const isPeak = peakDay?.day === point.day && point.total > 0;
                    return (
                      <div
                        key={point.day}
                        style={{ flex: scrollChart ? "0 0 22px" : 1, display: "grid", gap: 4, justifyItems: "center", alignContent: "end", minWidth: 0 }}
                        title={`${compactDate(point.day)} · ${money(point.total)} · ${point.orders} ออเดอร์`}
                      >
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 800,
                            color: isPeak ? "var(--p-deep)" : "transparent",
                            background: isPeak ? "var(--p-soft)" : "transparent",
                            borderRadius: 6,
                            padding: "2px 5px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {moneyCompact(point.total)}
                        </span>
                        <div
                          style={{
                            width: "100%",
                            maxWidth: 26,
                            height,
                            borderRadius: "6px 6px 3px 3px",
                            background: point.total > 0 ? "linear-gradient(180deg, var(--p), #f2938a)" : "var(--chip)",
                            boxShadow: isPeak ? "0 4px 12px -3px var(--p)" : "none",
                            outline: isToday ? "2px solid var(--p)" : "none",
                            outlineOffset: 1,
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
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 9 }}>
              {peakDay ? (
                <span style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: "var(--p)", display: "inline-block" }} />
                  สูงสุด {compactDate(peakDay.day)} · <b style={{ color: "var(--ink)" }}>{money(peakDay.total)}</b>
                </span>
              ) : null}
              <span style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 10, borderTop: "2px dashed rgba(180,35,24,.5)", display: "inline-block" }} />
                เฉลี่ย/วัน <b style={{ color: "var(--ink)" }}>{money(Math.round(avgPerDay))}</b>
              </span>
            </div>
          </>
        )}
      </div>

      {/* top products with share bars */}
      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="star" size={15} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, flex: 1 }}>Top 5 สินค้าขายดี</h3>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>ตามยอดขาย</span>
        </div>
        {top.length === 0 ? (
          <p style={{ margin: "4px 0", fontSize: 13, color: "var(--muted)" }}>ยังไม่มีข้อมูลในช่วงนี้</p>
        ) : (
          top.map((product, i) => {
            const share = Math.max(Math.round((product.revenue / topMax) * 100), 4);
            const rankBg = i === 0 ? "var(--p)" : i === 1 ? "var(--p-soft)" : "var(--chip)";
            const rankFg = i === 0 ? "#fff" : i === 1 ? "var(--p-deep)" : "var(--muted)";
            return (
              <div key={product.key} style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, background: rankBg, color: rankFg }}>
                    {i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {product.name}
                  </span>
                  <span style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap" }}>{money(product.revenue)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ width: 24, flexShrink: 0 }} />
                  <div style={{ flex: 1, height: 7, borderRadius: 999, background: "var(--chip)", overflow: "hidden" }}>
                    <div style={{ width: `${share}%`, height: "100%", borderRadius: 999, background: "linear-gradient(90deg, var(--p), #f2938a)" }} />
                  </div>
                  <span style={{ fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {product.quantity.toLocaleString("th-TH")} {product.unit}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
