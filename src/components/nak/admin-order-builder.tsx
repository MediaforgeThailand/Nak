"use client";

import { useMemo, useState } from "react";
import { createAdminOrderAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { SubmitButton } from "@/components/ui/submit-button";
import { money } from "@/lib/format";

export type BuilderCustomer = { id: string; name: string };
export type BuilderProduct = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  qty: number; // available stock
  categoryName: string;
};

// Admin order-on-behalf builder: pick a customer, tick quantities per product,
// choose shipping, submit. Final pricing (customer discounts, tiers) is computed
// by admin_create_order — the on-screen total is the pre-discount estimate.
export function AdminOrderBuilder({ customers, products }: { customers: BuilderCustomer[]; products: BuilderProduct[] }) {
  const [customerId, setCustomerId] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<"flash" | "grab">("flash");
  const [note, setNote] = useState("");

  function setQuantity(id: string, value: number, max: number) {
    const clamped = Math.max(0, Math.min(Math.floor(Number.isFinite(value) ? value : 0), max));
    setQty((prev) => ({ ...prev, [id]: clamped }));
  }

  const selected = products.filter((p) => (qty[p.id] ?? 0) > 0);
  const totalPieces = selected.reduce((sum, p) => sum + (qty[p.id] ?? 0), 0);
  const estSubtotal = selected.reduce((sum, p) => sum + p.price * (qty[p.id] ?? 0), 0);
  const items = selected.map((p) => ({ product_id: p.id, quantity: qty[p.id] ?? 0 }));
  const canSubmit = customerId !== "" && items.length > 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.sku} ${p.categoryName}`.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <form action={createAdminOrderAction} style={{ display: "grid", gap: 13 }}>
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="shipping_method" value={method} />
      <input type="hidden" name="customer_note" value={note} />

      {/* customer + shipping */}
      <div className="ad-card" style={{ padding: 14, display: "grid", gap: 11 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 700 }}>ลูกค้า</label>
          <select className="ad-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">เลือกลูกค้า</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12.5, fontWeight: 700 }}>การจัดส่ง</label>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { key: "flash", label: "Flash / ขนส่ง", icon: "truck" },
              { key: "grab", label: "Grab / รับเอง", icon: "bike" },
            ] as const).map((m) => {
              const active = method === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  style={{
                    flex: 1,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: `2px solid ${active ? "var(--p)" : "var(--line)"}`,
                    background: active ? "var(--p-soft)" : "var(--surface)",
                    color: active ? "var(--p-deep)" : "var(--ink)",
                  }}
                >
                  <Icon name={m.icon} size={16} stroke={2.4} /> {m.label}
                </button>
              );
            })}
          </div>
        </div>
        <input
          className="ad-input"
          placeholder="หมายเหตุถึงทีมงาน (ไม่บังคับ)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* search */}
      <div className="ad-search">
        <Icon name="search" size={18} stroke={2.2} style={{ color: "var(--muted)" }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อสินค้า / SKU / หมวด" />
      </div>

      {/* product list with steppers */}
      <div className="ad-card" style={{ padding: 6 }}>
        {visible.length === 0 ? (
          <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13.5 }}>ไม่พบสินค้า</div>
        ) : null}
        {visible.map((p, i) => {
          const q = qty[p.id] ?? 0;
          const soldOut = p.qty <= 0;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 8px",
                borderBottom: i < visible.length - 1 ? "1px solid var(--line)" : "none",
                opacity: soldOut ? 0.5 : 1,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                  {money(p.price)} · {soldOut ? "หมดสต็อก" : `คงเหลือ ${p.qty.toLocaleString("th-TH")}`}
                </div>
              </div>
              {soldOut ? null : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <button type="button" aria-label="ลด" onClick={() => setQuantity(p.id, q - 1, p.qty)} className="ad-iconbtn" style={{ width: 32, height: 32 }}>
                    <Icon name="minus" size={15} stroke={2.6} />
                  </button>
                  <input
                    className="ad-input"
                    inputMode="numeric"
                    value={q}
                    onChange={(e) => setQuantity(p.id, Number(e.target.value.replace(/[^\d]/g, "")), p.qty)}
                    style={{ width: 58, textAlign: "center", padding: "7px 4px" }}
                  />
                  <button type="button" aria-label="เพิ่ม" onClick={() => setQuantity(p.id, q + 1, p.qty)} className="ad-iconbtn" style={{ width: 32, height: 32 }}>
                    <Icon name="plus" size={15} stroke={2.6} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* summary + submit */}
      <div className="ad-card" style={{ padding: 14, display: "grid", gap: 10, position: "sticky", bottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: "var(--muted)" }}>เลือกแล้ว</span>
          <span style={{ fontWeight: 700 }}>
            {selected.length.toLocaleString("th-TH")} รายการ · {totalPieces.toLocaleString("th-TH")} ชิ้น
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 12.5, color: "var(--muted)" }}>ยอดตั้งต้น (ก่อนส่วนลด)</span>
          <span style={{ fontSize: 20, fontWeight: 800 }}>{money(estSubtotal)}</span>
        </div>
        <SubmitButton pendingLabel="กำลังสร้างออเดอร์..." className="w-full" disabled={!canSubmit}>
          <Icon name="check" size={17} stroke={2.4} /> สร้างออเดอร์ให้ลูกค้า
        </SubmitButton>
        <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
          ราคาสุทธิจะคำนวณตามส่วนลดของลูกค้ารายนี้อัตโนมัติเมื่อสร้างออเดอร์ · ออเดอร์จะไปรออนุมัติเหมือนลูกค้าสั่งเอง
        </p>
      </div>
    </form>
  );
}
