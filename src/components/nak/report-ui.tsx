import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { money } from "@/lib/format";
import { moneyCompact } from "@/lib/sales";

// Shared visualization primitives for the admin report pages. Server-safe
// (no client JS) — same inline-style idiom and tone palette as /admin/sales.

const TONES = {
  accent: { bg: "var(--p-soft)", fg: "var(--p-deep)" },
  success: { bg: "#e7f4ec", fg: "#1b7a4b" },
  warning: { bg: "#fbeedd", fg: "#a35a10" },
  danger: { bg: "#fbe6e3", fg: "#b42318" },
  neutral: { bg: "var(--chip)", fg: "var(--muted)" },
} as const;

export type ReportTone = keyof typeof TONES;

/** Compact for tiles: full baht under 10k, ฿12.5K / ฿1.2M above. */
export function tileMoney(value: number) {
  return value < 10_000 ? money(value) : moneyCompact(value);
}

export function KpiTile({
  icon,
  label,
  value,
  sub,
  tone = "accent",
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  tone?: ReportTone;
}) {
  const palette = TONES[tone];
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
        {sub ? <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{sub}</div> : null}
      </div>
    </div>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{children}</div>;
}

export function ChartCard({
  icon,
  title,
  meta,
  children,
}: {
  icon: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ad-card" style={{ padding: 16, display: "grid", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name={icon} size={15} stroke={2.2} style={{ color: "var(--p)" }} />
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, flex: 1 }}>{title}</h3>
        {meta ? <span style={{ fontSize: 11, color: "var(--muted)" }}>{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function EmptyNote({ text }: { text: string }) {
  return (
    <div style={{ padding: "18px 0", textAlign: "center", color: "var(--muted)", fontSize: 13, display: "grid", gap: 8, justifyItems: "center" }}>
      <Icon name="dash" size={26} stroke={1.6} style={{ opacity: 0.4 }} />
      {text}
    </div>
  );
}

export type ShareRow = {
  key: string;
  name: string;
  value: number;
  /** Right-aligned bold value; defaults to money(value). */
  valueLabel?: string;
  /** Small note at the right end of the bar row (e.g. "12 ชิ้น"). */
  sub?: string;
};

/** Ranked list with relative share bars — same look as the sales Top 5. */
export function ShareList({ rows, barTone = "accent" }: { rows: ShareRow[]; barTone?: "accent" | "warning" }) {
  if (rows.length === 0) return <EmptyNote text="ยังไม่มีข้อมูลในช่วงนี้" />;
  const max = Math.max(...rows.map((row) => row.value), 1);
  const fill =
    barTone === "warning"
      ? "linear-gradient(90deg, #d98324, #f2b705)"
      : "linear-gradient(90deg, var(--p), #f2938a)";
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {rows.map((row, i) => {
        const share = Math.max(Math.round((row.value / max) * 100), 4);
        const rankBg = i === 0 ? "var(--p)" : i === 1 ? "var(--p-soft)" : "var(--chip)";
        const rankFg = i === 0 ? "#fff" : i === 1 ? "var(--p-deep)" : "var(--muted)";
        return (
          <div key={row.key} style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 24, height: 24, borderRadius: 8, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, background: rankBg, color: rankFg }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.name}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap" }}>{row.valueLabel ?? money(row.value)}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 24, flexShrink: 0 }} />
              <div style={{ flex: 1, height: 7, borderRadius: 999, background: "var(--chip)", overflow: "hidden" }}>
                <div style={{ width: `${share}%`, height: "100%", borderRadius: 999, background: fill }} />
              </div>
              {row.sub ? (
                <span style={{ fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{row.sub}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export type BarPoint = {
  key: string;
  /** Short x-axis label (e.g. day-of-month). */
  label: string;
  value: number;
  /** Hover tooltip (HTML title). */
  title?: string;
};

/** Compact daily bar chart (same technique as the sales chart, 120px tall). */
export function MiniBarChart({
  points,
  highlightKey,
  valueLabel = moneyCompact,
}: {
  points: BarPoint[];
  highlightKey?: string;
  valueLabel?: (value: number) => string;
}) {
  if (points.every((point) => point.value <= 0)) return <EmptyNote text="ยังไม่มีข้อมูลในช่วงนี้" />;
  const max = Math.max(...points.map((point) => point.value), 1);
  const active = points.filter((point) => point.value > 0);
  const peak = active.length > 0 ? active.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const scroll = points.length > 14;
  return (
    <div style={{ overflowX: scroll ? "auto" : "visible", paddingBottom: 2 }}>
      <div style={{ minWidth: scroll ? points.length * 26 : undefined }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 122 }}>
          {points.map((point) => {
            const height = point.value > 0 ? Math.max(Math.round((point.value / max) * 76), 6) : 3;
            const isPeak = peak?.key === point.key && point.value > 0;
            const isHot = highlightKey === point.key;
            return (
              <div
                key={point.key}
                style={{ flex: scroll ? "0 0 22px" : 1, display: "grid", gap: 4, justifyItems: "center", alignContent: "end", minWidth: 0 }}
                title={point.title}
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
                  {valueLabel(point.value)}
                </span>
                <div
                  style={{
                    width: "100%",
                    maxWidth: 26,
                    height,
                    borderRadius: "6px 6px 3px 3px",
                    background: point.value > 0 ? "linear-gradient(180deg, var(--p), #f2938a)" : "var(--chip)",
                    boxShadow: isPeak ? "0 4px 12px -3px var(--p)" : "none",
                    outline: isHot ? "2px solid var(--p)" : "none",
                    outlineOffset: 1,
                  }}
                />
                <span style={{ fontSize: 8.5, color: isHot ? "var(--p)" : "var(--muted)", fontWeight: isHot ? 800 : 500, whiteSpace: "nowrap" }}>
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function DeltaChip({ current, previous }: { current: number; previous: number }) {
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

/** Gradient hero block for a report's headline number. */
export function ReportHero({
  icon,
  caption,
  value,
  children,
}: {
  icon: string;
  caption: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="nak-card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, var(--p-deep), var(--p))", color: "#fff", padding: "16px 16px 17px", display: "grid", gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.85, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name={icon} size={14} stroke={2.2} /> {caption}
        </span>
        <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>{value}</div>
        {children ? <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>{children}</div> : null}
      </div>
    </div>
  );
}

/** Preset period chips driven by ?range= GET links. */
export function RangeChips({
  basePath,
  presets,
  activeKey,
}: {
  basePath: string;
  presets: { key: string; label: string }[];
  activeKey: string;
}) {
  return (
    <div className="nak-chiprow" style={{ margin: "-2px 0" }}>
      {presets.map((preset) => (
        <Link
          key={preset.key}
          href={`${basePath}?range=${preset.key}`}
          className={"nak-chip" + (preset.key === activeKey ? " is-on" : "")}
        >
          {preset.label}
        </Link>
      ))}
    </div>
  );
}

/** Hub row linking to a detail report, with a live one-line stat. */
export function ReportLinkRow({
  href,
  icon,
  title,
  sub,
  tone = "accent",
  last = false,
}: {
  href: string;
  icon: string;
  title: string;
  sub: string;
  tone?: ReportTone;
  last?: boolean;
}) {
  const palette = TONES[tone];
  return (
    <Link
      href={href}
      className="ad-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "13px 14px",
        borderBottom: last ? "none" : "1px solid var(--line)",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <span style={{ width: 38, height: 38, borderRadius: 12, background: palette.bg, color: palette.fg, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={18} stroke={2.2} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</span>
      </span>
      <Icon name="chevR" size={16} stroke={2.4} style={{ color: "var(--muted)", flexShrink: 0 }} />
    </Link>
  );
}
