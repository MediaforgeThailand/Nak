"use client";

import { useState } from "react";
import { deleteProductPermanentlyAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/ui/submit-button";

const CONFIRM_TEXT = "ยืนยันการลบ";

// Admin-only permanent delete with a typed confirmation ("ยืนยันการลบ") before
// the submit button unlocks. Rendered OUTSIDE the product edit form — it is a
// form of its own. The server action re-checks the phrase and admin role.
export function DeleteProductConfirm({ productId, productName }: { productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const matched = text.trim() === CONFIRM_TEXT;

  if (!open) {
    return (
      <div style={{ padding: "0 10px 14px" }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            border: "1px dashed #f0b9b2",
            background: "transparent",
            color: "#b42318",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
          }}
        >
          ลบสินค้านี้ออกจากระบบ...
        </button>
      </div>
    );
  }

  return (
    <form
      action={deleteProductPermanentlyAction}
      style={{
        margin: "0 10px 14px",
        padding: 12,
        border: "1px solid #f0b9b2",
        background: "#fdecea",
        borderRadius: 12,
        display: "grid",
        gap: 9,
      }}
    >
      <input type="hidden" name="id" value={productId} />
      <p style={{ margin: 0, fontSize: 12.5, color: "#b42318", lineHeight: 1.55 }}>
        กำลังจะลบ <b>{productName}</b> ออกจากระบบถาวร — พิมพ์ <b>{CONFIRM_TEXT}</b> เพื่อปลดล็อกปุ่มลบ
        <br />
        <span style={{ opacity: 0.8 }}>(สินค้าที่เคยมีออเดอร์จะถูกปิดการขายแทน เพื่อไม่ให้ประวัติออเดอร์เสียหาย)</span>
      </p>
      <input
        className="ad-input"
        name="confirm_text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={CONFIRM_TEXT}
        autoComplete="off"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setText("");
          }}
          style={{ border: "1px solid var(--line)", background: "#fff", borderRadius: 10, padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
        >
          ยกเลิก
        </button>
        <SubmitButton variant="danger" disabled={!matched} pendingLabel="กำลังลบ...">
          ลบถาวร
        </SubmitButton>
      </div>
    </form>
  );
}
