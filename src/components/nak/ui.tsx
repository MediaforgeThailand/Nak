import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/nak/icon";
import { orderStatusMeta } from "@/lib/format";

/* ── admin inline back header ──────────────────────────────────── */
export function BackHead({ title, backHref, right }: { title: string; backHref: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <Link href={backHref} className="ad-iconbtn" aria-label="ย้อนกลับ">
        <Icon name="chevL" size={19} stroke={2.4} />
      </Link>
      <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.01em", flex: 1, minWidth: 0 }}>{title}</h2>
      {right}
    </div>
  );
}

/* ── tone palettes ─────────────────────────────────────────────── */
type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const BADGE_TONES: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: "var(--chip)", fg: "var(--muted)" },
  accent: { bg: "var(--p-soft)", fg: "var(--p-deep)" },
  success: { bg: "#e7f4ec", fg: "#1b7a4b" },
  warning: { bg: "#fbeedd", fg: "#a35a10" },
  danger: { bg: "#fbe6e3", fg: "#b42318" },
};

export function Badge({
  tone = "neutral",
  size = "md",
  children,
}: {
  tone?: Tone;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  const c = BADGE_TONES[tone] ?? BADGE_TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: c.bg,
        color: c.fg,
        fontSize: size === "sm" ? 11 : 12.5,
        fontWeight: 600,
        lineHeight: 1,
        padding: size === "sm" ? "4px 8px" : "5px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const m = orderStatusMeta(status);
  return (
    <Badge tone={m.tone}>
      <Icon name={m.icon} size={13} stroke={2.4} />
      {m.label}
    </Badge>
  );
}

/* ── deterministic product tint (no uploaded image yet) ────────── */
const TINTS: [string, string][] = [
  ["#dbeafe", "#1d4ed8"],
  ["#fef3c7", "#a16207"],
  ["#fee2e2", "#b91c1c"],
  ["#ecfccb", "#4d7c0f"],
  ["#cffafe", "#0e7490"],
  ["#f1f5f9", "#475569"],
  ["#fde68a", "#854d0e"],
  ["#ede9d9", "#92400e"],
];

export function tintFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % TINTS.length;
  return TINTS[h];
}

export function ProductImage({
  seed,
  imageUrl,
  alt,
  icon = "package",
  ratio = "1 / 1",
  radius = "var(--r-sm)",
  iconSize = 46,
}: {
  seed: string;
  imageUrl?: string | null;
  alt?: string;
  icon?: string;
  ratio?: string;
  radius?: string;
  iconSize?: number;
}) {
  const [tint, ink] = tintFor(seed);
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: ratio,
        borderRadius: radius,
        overflow: "hidden",
        background: tint,
        display: "grid",
        placeItems: "center",
      }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt={alt ?? ""} fill sizes="(max-width: 480px) 50vw, 240px" className="object-cover" />
      ) : (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "radial-gradient(120% 90% at 28% 18%, rgba(255,255,255,.65), rgba(255,255,255,0) 60%)",
            }}
          />
          <div style={{ color: ink, opacity: 0.32 }}>
            <Icon name={icon} size={iconSize} stroke={1.6} />
          </div>
          <span
            style={{
              position: "absolute",
              right: 8,
              bottom: 8,
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: ".06em",
              color: ink,
              opacity: 0.5,
            }}
          >
            NAK
          </span>
        </>
      )}
    </div>
  );
}

/* ── 3-step order progress ─────────────────────────────────────── */
export function OrderProgress({ status, compact = false }: { status: string; compact?: boolean }) {
  const steps = ["รออนุมัติ", "กำลังจัดส่ง", "จัดส่งแล้ว"];
  const m = orderStatusMeta(status);
  const rejected = m.step === -1;
  const active = rejected ? 0 : m.step;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
      {steps.map((label, i) => {
        const done = !rejected && i <= active;
        const isCur = !rejected && i === active;
        const dotBg = rejected && i === 0 ? "#b42318" : done ? "var(--p)" : "var(--line)";
        const dotFg = done || (rejected && i === 0) ? "#fff" : "var(--muted)";
        return (
          <div key={label} style={{ display: "contents" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                flex: "0 0 auto",
                width: compact ? 64 : 80,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  background: dotBg,
                  color: dotFg,
                  display: "grid",
                  placeItems: "center",
                  boxShadow: isCur ? "0 0 0 4px var(--p-soft)" : "none",
                  transition: "all .2s",
                }}
              >
                <Icon
                  name={rejected && i === 0 ? "x" : done ? "check" : i === 0 ? "clock" : i === 1 ? "truck" : "package"}
                  size={14}
                  stroke={2.6}
                />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isCur ? 700 : 500,
                  color: done ? "var(--ink)" : "var(--muted)",
                  textAlign: "center",
                  lineHeight: 1.25,
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: !rejected && i < active ? "var(--p)" : "var(--line)",
                  marginTop: 12,
                  borderRadius: 2,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── customer stat tile ────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "success";
  icon?: string;
}) {
  const fg = tone === "warning" ? "#a35a10" : tone === "success" ? "#1b7a4b" : "var(--ink)";
  return (
    <div className="nak-card" style={{ padding: "13px 14px", display: "grid", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--muted)", minWidth: 0 }}>
        {icon && <Icon name={icon} size={14} stroke={2.2} />}
        <span
          style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {label}
        </span>
      </div>
      <span style={{ fontSize: 20, fontWeight: 700, color: fg, letterSpacing: "-.01em" }}>{value}</span>
    </div>
  );
}

/* ── small row used in money summaries ─────────────────────────── */
export function Row({
  label,
  value,
  valColor,
  bold,
  small,
}: {
  label: string;
  value: string;
  valColor?: string;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: small ? 12.5 : 13.5, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: bold ? 16 : 13.5, fontWeight: bold ? 800 : 600, color: valColor ?? "var(--ink)" }}>
        {value}
      </span>
    </div>
  );
}

/* ── admin: badge / avatar / thumb / stat tile ─────────────────── */
export function AdBadge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const c = BADGE_TONES[tone] ?? BADGE_TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: c.bg,
        color: c.fg,
        fontSize: 12.5,
        fontWeight: 600,
        lineHeight: 1,
        padding: "5px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function Avatar({
  name,
  tone = "accent",
  size = 38,
}: {
  name: string;
  tone?: "accent" | "warning" | "neutral";
  size?: number;
}) {
  const initials = (name || "?").trim().slice(0, 1);
  const c = {
    accent: ["var(--p-soft)", "var(--p-deep)"],
    warning: ["#fbeedd", "#a35a10"],
    neutral: ["var(--chip)", "var(--muted)"],
  }[tone];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        background: c[0],
        color: c[1],
        display: "grid",
        placeItems: "center",
        fontSize: size * 0.42,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

export function AdThumb({
  name,
  imageUrl,
  size = 38,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const [bg, fg] = tintFor(name || "?");
  return (
    <span
      style={{
        position: "relative",
        width: size,
        height: size,
        borderRadius: 10,
        background: bg,
        color: fg,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill sizes="64px" className="object-cover" />
      ) : (
        <Icon name="package" size={size * 0.5} stroke={1.7} />
      )}
    </span>
  );
}

export function StatTile({
  icon,
  label,
  value,
  tone = "neutral",
  hint,
}: {
  icon: string;
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger" | "success";
  hint?: string;
}) {
  const accent = { neutral: "var(--p)", warning: "#c2740f", danger: "#b42318", success: "#1b7a4b" }[tone];
  const soft = { neutral: "var(--p-soft)", warning: "#fbeedd", danger: "#fbe6e3", success: "#e7f4ec" }[tone];
  return (
    <div className="ad-card" style={{ padding: 18, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: soft,
            color: accent,
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name={icon} size={20} stroke={2.2} />
        </span>
        {hint && <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{hint}</span>}
      </div>
      <div>
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: "-.02em",
            color: tone === "danger" ? "#b42318" : "var(--ink)",
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok";
}) {
  const fg = tone === "warn" ? "#a35a10" : tone === "ok" ? "#1b7a4b" : "var(--ink)";
  return (
    <div style={{ background: "var(--bg)", borderRadius: 12, padding: "11px 13px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: fg, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-.02em" }}>{title}</h2>
        {sub && <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)" }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── form field label ──────────────────────────────────────────── */
export function NakField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 11.5, fontWeight: 400, color: "var(--muted)" }}>{hint}</span> : null}
    </label>
  );
}

/* ── profile section card + info row ───────────────────────────── */
export function SectionCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="nak-card" style={{ padding: 16, display: "grid", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <Icon name={icon} size={16} stroke={2.2} style={{ color: "var(--p)" }} />
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{title}</h3>
        {action ? <span style={{ marginLeft: "auto" }}>{action}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: string;
  label: string;
  value: ReactNode;
  last?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 11, padding: "9px 0", borderBottom: last ? "none" : "1px solid var(--line)" }}>
      <Icon name={icon} size={16} stroke={2} style={{ color: "var(--muted)", marginTop: 2 }} />
      <div>
        <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{value}</div>
      </div>
    </div>
  );
}

/* ── admin segmented tabs (stage navigation via Link) ──────────── */
export function AdminTabs({
  tabs,
  active,
}: {
  tabs: { key: string; label: string; href: string; count?: number }[];
  active: string;
}) {
  return (
    <div
      className="ad-card"
      style={{ padding: 5, display: "grid", gridTemplateColumns: `repeat(${tabs.length}, 1fr)`, gap: 4 }}
    >
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <a
            key={t.key}
            href={t.href}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "11px 4px",
              borderRadius: "calc(var(--r) - 7px)",
              border: "none",
              cursor: "pointer",
              background: on ? "var(--p)" : "transparent",
              color: on ? "#fff" : "var(--muted)",
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: "nowrap",
              transition: "all .15s",
            }}
          >
            {t.label}
            {t.count ? (
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 999,
                  background: on ? "rgba(255,255,255,.22)" : "#fbe6e3",
                  color: on ? "#fff" : "#b42318",
                  fontSize: 11.5,
                  fontWeight: 700,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {t.count}
              </span>
            ) : null}
          </a>
        );
      })}
    </div>
  );
}

export type StyleProp = CSSProperties;
