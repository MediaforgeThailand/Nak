"use client";

import { useState } from "react";
import { shipOrderWithPhotoAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { SubmitButton } from "@/components/ui/submit-button";

export type PackItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  lineTotal: string;
};

// Packing station form: a big, tick-one-at-a-time checklist so the packer can
// mark each SKU as picked (orders with many SKUs are easy to muddle), then a
// compact photo upload. "จัดสินค้าเสร็จแล้ว" only unlocks once every line is ticked.
export function PackForm({ orderId, items, isGrab }: { orderId: string; items: PackItem[]; isGrab: boolean }) {
  const [packed, setPacked] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setPacked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allPacked = items.length > 0 && items.every((it) => packed.has(it.id));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* checklist header + progress */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--p-deep)" }}>รายการที่ต้องจัด</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            padding: "3px 10px",
            borderRadius: 999,
            background: allPacked ? "#e7f4ec" : "var(--chip)",
            color: allPacked ? "#1b7a4b" : "var(--muted)",
          }}
        >
          จัดแล้ว {packed.size}/{items.length}
        </span>
      </div>

      {/* big, tap-to-check item list — product name is the most prominent thing */}
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((it) => {
          const done = packed.has(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => toggle(it.id)}
              aria-pressed={done}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "13px 14px",
                borderRadius: 14,
                cursor: "pointer",
                border: `2px solid ${done ? "#8fd3ab" : "var(--line)"}`,
                background: done ? "#eef8f1" : "var(--surface)",
                transition: "background .15s, border-color .15s",
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  border: `2px solid ${done ? "#1b7a4b" : "var(--line)"}`,
                  background: done ? "#1b7a4b" : "transparent",
                  color: "#fff",
                }}
              >
                {done ? <Icon name="check" size={18} stroke={3} /> : null}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: 17,
                    fontWeight: 800,
                    lineHeight: 1.25,
                    color: "var(--ink)",
                    textDecoration: done ? "line-through" : "none",
                    textDecorationColor: "#8fd3ab",
                  }}
                >
                  {it.name}
                </span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: "var(--p-deep)", marginTop: 3 }}>
                  × {it.quantity.toLocaleString("th-TH")} {it.unit}
                </span>
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {it.lineTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* pack photo + confirm — locked until every line is ticked */}
      <form action={shipOrderWithPhotoAction} style={{ display: "grid", gap: 10, marginTop: 2 }}>
        <input type="hidden" name="order_id" value={orderId} />
        <FileUploadPreview name="photo" accept="image/*" capture="environment" required compact hint="แนบรูปสินค้าที่แพ็คเสร็จ" />
        <input className="ad-input" name="caption" placeholder="หมายเหตุรูป (ไม่บังคับ)" />
        <SubmitButton pendingLabel="กำลังบันทึก..." className="w-full" disabled={!allPacked}>
          <Icon name="check" size={17} stroke={2.4} /> จัดสินค้าเสร็จแล้ว
        </SubmitButton>
        {!allPacked ? (
          <p style={{ margin: 0, fontSize: 11.5, color: "#a35a10", textAlign: "center" }}>
            ติ๊กรายการที่จัดครบทุกช่องก่อน ถึงจะกดจัดเสร็จได้
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
            {isGrab ? "ออเดอร์ Grab จะข้ามไป “ส่งแล้ว” ทันที" : "ออเดอร์ Flash จะไปขั้น “จัดส่ง” เพื่อส่งให้ขนส่ง"}
          </p>
        )}
      </form>
    </div>
  );
}
