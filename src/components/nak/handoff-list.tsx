"use client";

import Image from "next/image";
import { useState } from "react";
import { cancelOrderAction, confirmHandoffAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { SubmitButton } from "@/components/ui/submit-button";

export type HandoffOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  isGrab: boolean;
  methodLabel: string;
  customerName: string;
  phone: string;
  address: string;
  copyText: string;
  items: { id: string; label: string; total: string }[];
  photos: { id: string; url: string | null; caption: string | null }[];
};

async function writeClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // LINE in-app browser / older WebViews block the async clipboard API.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

const SEPARATOR = "\n____________________\n";

export function HandoffList({ orders, canCancel = false }: { orders: HandoffOrder[]; canCancel?: boolean }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy(id: string, text: string) {
    await writeClipboard(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1800);
  }

  const allText = orders.map((o) => o.copyText).join(SEPARATOR);

  return (
    <div style={{ display: "grid", gap: 11 }}>
      {/* copy every order's code · phone · address at once */}
      <button
        type="button"
        onClick={() => copy("all", allText)}
        className={"ad-btn " + (copiedId === "all" ? "" : "ad-btn-primary")}
        style={copiedId === "all" ? { background: "#e7f4ec", color: "#1b7a4b", border: "1px solid #bfe3cd" } : undefined}
      >
        <Icon name={copiedId === "all" ? "checkCircle" : "copy"} size={17} stroke={2.4} />
        {copiedId === "all" ? "คัดลอกทั้งหมดแล้ว" : `คัดลอกข้อมูลทั้งหมด (${orders.length} ออเดอร์)`}
      </button>

      <div className="ad-card" style={{ padding: 4 }}>
        {orders.map((order, i) => {
          const open = expanded.has(order.id);
          const copied = copiedId === order.id;
          return (
            <div key={order.id} style={{ borderBottom: i < orders.length - 1 ? "1px solid var(--line)" : "none" }}>
              {/* collapsed row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 8px" }}>
                <button
                  type="button"
                  onClick={() => toggle(order.id)}
                  aria-expanded={open}
                  style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "2px 0" }}
                >
                  <Icon name={open ? "chevD" : "chevR"} size={16} stroke={2.6} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 14.5, fontWeight: 800, letterSpacing: ".01em" }}>{order.orderNumber}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {order.customerName} · {order.methodLabel}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => copy(order.id, order.copyText)}
                  className="ad-iconbtn"
                  aria-label="คัดลอกรหัส เบอร์ ที่อยู่"
                  style={copied ? { background: "#e7f4ec", color: "#1b7a4b", borderColor: "#bfe3cd" } : undefined}
                >
                  <Icon name={copied ? "checkCircle" : "copy"} size={16} stroke={2.4} />
                </button>
              </div>

              {/* expanded details */}
              {open ? (
                <div style={{ padding: "0 8px 13px", display: "grid", gap: 11 }}>
                  <div
                    style={{
                      background: "var(--bg)",
                      border: "1px dashed var(--p)",
                      borderRadius: "var(--r-sm)",
                      padding: "11px 14px",
                      display: "grid",
                      gap: 2,
                      justifyItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)" }}>รหัสออเดอร์สำหรับขนส่ง</span>
                    <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: ".04em" }}>{order.orderNumber}</span>
                    <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{order.createdAt}</span>
                  </div>

                  <div style={{ background: "var(--p-soft)", borderRadius: "var(--r-sm)", padding: 12, display: "grid", gap: 7, fontSize: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                      <Icon name="user" size={15} stroke={2.2} style={{ color: "var(--p-deep)" }} /> {order.customerName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted)" }}>
                      <Icon name="phone" size={15} stroke={2.2} style={{ color: "var(--p-deep)" }} /> {order.phone || "-"}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--muted)" }}>
                      <Icon name="pin" size={15} stroke={2.2} style={{ color: "var(--p-deep)", flexShrink: 0, marginTop: 1 }} /> {order.address}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => copy(order.id, order.copyText)}
                    className={"ad-btn " + (copied ? "" : "ad-btn-ghost")}
                    style={copied ? { background: "#e7f4ec", color: "#1b7a4b", border: "1px solid #bfe3cd" } : undefined}
                  >
                    <Icon name={copied ? "checkCircle" : "copy"} size={16} stroke={2.4} />
                    {copied ? "คัดลอกแล้ว" : "คัดลอกรหัส · เบอร์ · ที่อยู่"}
                  </button>

                  {order.items.length > 0 ? (
                    <div style={{ display: "grid", gap: 6, border: "1px solid var(--line)", borderRadius: "var(--r-sm)", padding: 11, background: "var(--bg)" }}>
                      {order.items.map((it) => (
                        <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
                          <span style={{ minWidth: 0 }}>{it.label}</span>
                          <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{it.total}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {order.photos.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {order.photos.map((photo) => (
                        <div
                          key={photo.id}
                          style={{ position: "relative", aspectRatio: "4/3", borderRadius: "var(--r-sm)", overflow: "hidden", background: "var(--chip)", display: "grid", placeItems: "center", color: "rgba(0,0,0,.28)" }}
                        >
                          {photo.url ? (
                            <Image src={photo.url} alt={photo.caption ?? "รูปสินค้าที่แพ็ค"} fill sizes="440px" className="object-cover" />
                          ) : (
                            <Icon name="camera" size={26} stroke={1.6} />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <form action={confirmHandoffAction}>
                    <input type="hidden" name="order_id" value={order.id} />
                    <SubmitButton pendingLabel="กำลังยืนยัน..." className="w-full">
                      <Icon name="truck" size={17} stroke={2.4} /> ส่งให้ขนส่งแล้ว
                    </SubmitButton>
                  </form>

                  {/* Admin-only escape hatch before the parcel leaves: restores
                      stock and reverses the customer's debt. */}
                  {canCancel ? (
                    <details>
                      <summary style={{ fontSize: 12, color: "#b42318", fontWeight: 700, cursor: "pointer", textAlign: "center" }}>
                        ยกเลิกออเดอร์นี้ (คืนสต็อก + คืนยอดหนี้)
                      </summary>
                      <form action={cancelOrderAction} style={{ marginTop: 8, display: "flex", gap: 8 }}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <input type="hidden" name="stage" value="handoff" />
                        <input className="ad-input" name="reason" placeholder="เหตุผลการยกเลิก (จำเป็น)" required />
                        <SubmitButton variant="danger" pendingLabel="..." className="w-auto shrink-0 px-4">
                          ยืนยันยกเลิก
                        </SubmitButton>
                      </form>
                    </details>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
