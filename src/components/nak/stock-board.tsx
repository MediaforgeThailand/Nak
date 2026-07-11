"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/nak/icon";

export type StockBoardItem = {
  id: string;
  name: string; // full name (used for search)
  shortName: string; // flavour part shown on the tile
  sku: string;
  qty: number;
  tone: "success" | "warning" | "danger";
};

export type StockBoardGroup = {
  id: string;
  name: string;
  items: StockBoardItem[];
};

const TILE_TONE: Record<StockBoardItem["tone"], { bg: string; border: string; num: string }> = {
  danger: { bg: "#fdecea", border: "#f0b9b2", num: "#b42318" },
  warning: { bg: "#fdf6ec", border: "#eed7ad", num: "#a35a10" },
  success: { bg: "rgba(255,255,255,.92)", border: "var(--line)", num: "#1b7a4b" },
};

// Whiteboard-style stock overview: every product is a fingertip-sized tile so
// the whole catalog scans in one screenful. Search + category chips narrow it.
export function StockBoard({ groups, canEdit }: { groups: StockBoardGroup[]; canEdit: boolean }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => cat === "all" || g.id === cat)
      .map((g) => ({
        ...g,
        items: q
          ? g.items.filter(
              (it) =>
                it.name.toLowerCase().includes(q) ||
                it.shortName.toLowerCase().includes(q) ||
                it.sku.toLowerCase().includes(q),
            )
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query, cat]);

  const shown = visible.reduce((n, g) => n + g.items.length, 0);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* sticky finder: search + category chips */}
      <div style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg)", padding: "4px 0 8px", display: "grid", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", display: "grid" }}>
            <Icon name="search" size={15} stroke={2.4} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสินค้า / รสชาติ / SKU..."
            style={{
              width: "100%",
              padding: "10px 12px 10px 34px",
              borderRadius: 12,
              border: "1px solid var(--line)",
              background: "#fff",
              fontSize: 13.5,
              outline: "none",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
          {[{ id: "all", name: "ทั้งหมด" }, ...groups].map((g) => {
            const active = cat === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setCat(active ? "all" : g.id)}
                style={{
                  flexShrink: 0,
                  padding: "6px 11px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 700,
                  border: `1px solid ${active ? "var(--p)" : "var(--line)"}`,
                  background: active ? "var(--p)" : "#fff",
                  color: active ? "#fff" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {g.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10.5, color: "var(--muted)", marginTop: -4 }}>
        <LegendDot color={TILE_TONE.success.num} label="ปกติ" />
        <LegendDot color={TILE_TONE.warning.num} label="เริ่มน้อย" />
        <LegendDot color={TILE_TONE.danger.num} label="ใกล้หมด / หมด" />
        <span style={{ marginLeft: "auto" }}>{shown.toLocaleString("th-TH")} รายการ</span>
      </div>

      {visible.map((group) => (
        <div key={group.id} style={{ display: "grid", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 800 }}>{group.name}</h3>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{group.items.length} รายการ</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(66px, 1fr))", gap: 5 }}>
            {group.items.map((it) => {
              const tone = TILE_TONE[it.tone];
              const tileStyle = {
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 3,
                minHeight: 58,
                minWidth: 0,
                padding: "5px 6px",
                borderRadius: 10,
                border: `1px solid ${tone.border}`,
                background: tone.bg,
                color: "var(--ink)",
              } as const;
              const inner = (
                <>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 650,
                      lineHeight: 1.25,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {it.shortName}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1, textAlign: "right", color: tone.num }}>
                    {it.qty.toLocaleString("th-TH")}
                  </span>
                </>
              );
              return canEdit ? (
                <Link key={it.id} href={`/admin/stock/add?product=${it.id}`} style={tileStyle} title={it.name}>
                  {inner}
                </Link>
              ) : (
                <div key={it.id} style={tileStyle} title={it.name}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {shown === 0 ? (
        <div className="ad-card" style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>
          ไม่พบสินค้าที่ตรงกับ &quot;{query}&quot;
        </div>
      ) : null}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
