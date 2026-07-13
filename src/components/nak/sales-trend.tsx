import { Icon } from "@/components/nak/icon";
import { compactDate, money } from "@/lib/format";
import { moneyCompact, type DailyPoint } from "@/lib/sales";

// Compact sales-trend sparkline for the reports hub: an at-a-glance area+line
// curve of the last N days so the owner sees the trajectory without drilling in.
// Matches the daily bar chart on /admin/reports/sales (brand gradient, dashed
// average line, peak marker) but stays overview-simple.
export function SalesTrend({ points }: { points: DailyPoint[] }) {
  const n = points.length;
  const totals = points.map((p) => p.total);
  const max = Math.max(...totals, 1);
  const sum = totals.reduce((a, b) => a + b, 0);
  const avg = n > 0 ? sum / n : 0;
  const activeCount = totals.filter((t) => t > 0).length;
  const peak = points.reduce((a, b) => (b.total > a.total ? b : a), points[0] ?? { day: "", total: 0, orders: 0 });
  const peakIdx = points.indexOf(peak);

  // Chart uses uniform-scaled user units (viewBox 300×76); the SVG scales to the
  // card width keeping the peak dot round and strokes crisp.
  const W = 300;
  const H = 76;
  const top = 8; // headroom so the peak marker isn't clipped
  const xAt = (i: number) => (n <= 1 ? W / 2 : (i / (n - 1)) * W);
  const yAt = (v: number) => top + (H - top) * (1 - v / max);

  const coords = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.total).toFixed(1)}`);
  const linePath = `M ${coords.join(" L ")}`;
  const areaPath = `M 0,${H} L ${coords.join(" L ")} L ${W},${H} Z`;
  const avgY = yAt(avg);
  const empty = sum <= 0;

  return (
    <div className="ad-card" style={{ padding: 16, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="trending" size={15} stroke={2.2} style={{ color: "var(--p)" }} />
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, flex: 1 }}>แนวโน้มยอดขาย {n} วัน</h3>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>รวม {moneyCompact(sum)}</span>
      </div>

      {empty ? (
        <div style={{ padding: "18px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          ยังไม่มียอดขายใน {n} วันที่ผ่านมา
        </div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ display: "block", width: "100%", height: "auto", overflow: "visible" }}
            role="img"
            aria-label={`แนวโน้มยอดขาย ${n} วัน รวม ${money(sum)}`}
          >
            <defs>
              <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--p)" stopOpacity="0.26" />
                <stop offset="100%" stopColor="var(--p)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={avgY} x2={W} y2={avgY} stroke="rgba(180,35,24,.32)" strokeWidth="1" strokeDasharray="4 4" />
            <path d={areaPath} fill="url(#salesTrendFill)" />
            <path d={linePath} fill="none" stroke="var(--p)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
            {peakIdx >= 0 ? (
              <circle cx={xAt(peakIdx)} cy={yAt(peak.total)} r="3.4" fill="var(--p-deep)" stroke="#fff" strokeWidth="1.6" />
            ) : null}
          </svg>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--muted)" }}>
            <span>{compactDate(points[0].day)}</span>
            <span>{compactDate(points[n - 1].day)}</span>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 9 }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--p-deep)", display: "inline-block" }} />
              สูงสุด {compactDate(peak.day)} · <b style={{ color: "var(--ink)" }}>{money(peak.total)}</b>
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, borderTop: "2px dashed rgba(180,35,24,.5)", display: "inline-block" }} />
              เฉลี่ย/วัน <b style={{ color: "var(--ink)" }}>{money(Math.round(avg))}</b>
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)", marginLeft: "auto" }}>
              ขาย {activeCount}/{n} วัน
            </span>
          </div>
        </>
      )}
    </div>
  );
}
