"use client";

import { useMemo, useState } from "react";
import { addStockAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { AdThumb } from "@/components/nak/ui";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { SubmitButton } from "@/components/ui/submit-button";

export type StockProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  qty: number;
  imageUrl: string | null;
};

const labelStyle = { fontSize: 12.5, fontWeight: 600, color: "var(--ink)" } as const;
const hintStyle = { fontSize: 11.5, color: "var(--muted)" } as const;

export function StockAddForm({ products, preselectId }: { products: StockProduct[]; preselectId?: string }) {
  const preset = preselectId ? products.find((p) => p.id === preselectId) ?? null : null;
  const [selectedId, setSelectedId] = useState<string | null>(preset?.id ?? null);
  const [query, setQuery] = useState(preset?.name ?? "");
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("0");

  const selected = useMemo(() => products.find((p) => p.id === selectedId) ?? null, [products, selectedId]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      : products;
    return list.slice(0, 8);
  }, [products, query]);

  const qtyNum = Number(qty.replace(/[^\d-]/g, "")) || 0;
  const canSubmit = Boolean(selectedId) && Number.isInteger(qtyNum) && qtyNum !== 0;

  function pick(p: StockProduct) {
    setSelectedId(p.id);
    setQuery(p.name);
    setOpen(false);
  }

  function bump(n: number) {
    setQty(String((Number(qty.replace(/[^\d-]/g, "")) || 0) + n));
  }

  return (
    <form action={addStockAction} style={{ display: "grid", gap: 15 }}>
      <input type="hidden" name="product_id" value={selectedId ?? ""} />

      {/* product search */}
      <div style={{ display: "grid", gap: 6, position: "relative" }}>
        <span style={labelStyle}>เลือกสินค้า</span>
        <div className="ad-search">
          <Icon name="search" size={17} stroke={2.2} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedId(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="พิมพ์ชื่อสินค้า หรือ SKU..."
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelectedId(null);
                setOpen(true);
              }}
              aria-label="ล้างคำค้นหา"
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center" }}
            >
              <Icon name="x" size={16} stroke={2.4} />
            </button>
          ) : null}
        </div>

        {open && !selected && results.length > 0 ? (
          <div
            className="ad-card"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 6,
              zIndex: 20,
              padding: 5,
              maxHeight: 320,
              overflowY: "auto",
              display: "grid",
              gap: 2,
            }}
          >
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: 8,
                  borderRadius: 10,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <AdThumb name={p.name} imageUrl={p.imageUrl} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                  <div style={hintStyle}>
                    {p.sku} · คงเหลือ {p.qty.toLocaleString("th-TH")} {p.unit}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : null}
        {open && !selected && results.length === 0 ? (
          <div className="ad-card" style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, zIndex: 20, padding: 12, ...hintStyle }}>
            ไม่พบสินค้าที่ตรงกับ &quot;{query}&quot;
          </div>
        ) : null}
      </div>

      {/* selected product */}
      {selected ? (
        <div className="ad-card" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
          <AdThumb name={selected.name} imageUrl={selected.imageUrl} size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</div>
            <div style={hintStyle}>{selected.sku}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={hintStyle}>คงเหลือ</div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>
              {selected.qty.toLocaleString("th-TH")} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>{selected.unit}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="ad-card" style={{ padding: 14, textAlign: "center", ...hintStyle }}>
          ยังไม่ได้เลือกสินค้า — พิมพ์ค้นหาด้านบน
        </div>
      )}

      {/* quantity */}
      <div style={{ display: "grid", gap: 8 }}>
        <span style={labelStyle}>จำนวนที่รับเข้า</span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" className="ad-iconbtn" onClick={() => bump(-1)} aria-label="ลด 1">
            <Icon name="minus" size={16} stroke={2.6} />
          </button>
          <input
            className="ad-input"
            name="quantity_delta"
            value={qty}
            onChange={(e) => setQty(e.target.value.replace(/[^\d-]/g, ""))}
            inputMode="numeric"
            style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 20, fontWeight: 800, padding: "10px 4px" }}
          />
          <button type="button" className="ad-iconbtn" onClick={() => bump(1)} aria-label="เพิ่ม 1">
            <Icon name="plus" size={16} stroke={2.6} />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
          {[1, 10, 100].map((n) => (
            <button key={n} type="button" className="ad-btn ad-btn-ghost" style={{ padding: "10px 4px" }} onClick={() => bump(n)}>
              +{n}
            </button>
          ))}
          <button type="button" className="ad-btn ad-btn-ghost" style={{ padding: "10px 4px" }} onClick={() => setQty("0")}>
            ล้าง
          </button>
        </div>
        <span style={hintStyle}>ใส่เลขติดลบเพื่อปรับสต็อกลง (แก้ยอด)</span>
      </div>

      {/* note */}
      <div style={{ display: "grid", gap: 6 }}>
        <span style={labelStyle}>เลขอ้างอิง / เหตุผล (ถ้ามี)</span>
        <input className="ad-input" name="note" placeholder="เช่น ล็อตที่ 2, ใบส่งของเลขที่..." />
      </div>

      {/* optional photo */}
      <div style={{ display: "grid", gap: 6 }}>
        <span style={labelStyle}>รูปของเข้า (ถ้ามี)</span>
        <FileUploadPreview name="photo" capture accept="image/*" hint="แนบรูปเพื่อยืนยันว่าของเข้า — เก็บไว้ดูย้อนหลังได้" />
      </div>

      <SubmitButton variant="primary" className="w-full" pendingLabel="กำลังบันทึก..." disabled={!canSubmit}>
        <Icon name="check" size={16} stroke={2.6} /> บันทึกรับเข้าสต็อก
      </SubmitButton>
    </form>
  );
}
