"use client";

import { useState } from "react";
import { adjustInventoryAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { SubmitButton } from "@/components/ui/submit-button";

export function StockAdjustRow({ productId }: { productId: string }) {
  const [delta, setDelta] = useState(0);

  return (
    <form action={adjustInventoryAction} style={{ display: "grid", gap: 7, minWidth: 0 }}>
      <input type="hidden" name="product_id" value={productId} />
      <div style={{ display: "flex", gap: 7, alignItems: "center", minWidth: 0 }}>
        <button type="button" className="ad-iconbtn" style={{ width: 36, height: 36, flexShrink: 0 }} onClick={() => setDelta((d) => d - 1)} aria-label="ลด">
          <Icon name="minus" size={15} stroke={2.6} />
        </button>
        <input
          className="ad-input"
          name="quantity_delta"
          value={delta}
          onChange={(e) => {
            const v = Number(e.target.value.replace(/[^\d-]/g, ""));
            setDelta(Number.isFinite(v) ? v : 0);
          }}
          inputMode="numeric"
          style={{ flex: 1, minWidth: 0, textAlign: "center", padding: "8px 4px" }}
        />
        <button type="button" className="ad-iconbtn" style={{ width: 36, height: 36, flexShrink: 0 }} onClick={() => setDelta((d) => d + 1)} aria-label="เพิ่ม">
          <Icon name="plus" size={15} stroke={2.6} />
        </button>
        <input
          className="ad-input"
          name="note"
          placeholder="เหตุผล"
          style={{ flex: 2, minWidth: 0, padding: "8px 10px", fontSize: 12.5 }}
        />
      </div>
      <SubmitButton variant="primary" pendingLabel="กำลังบันทึก..." className="w-full" disabled={delta === 0}>
        บันทึกการปรับสต็อก
      </SubmitButton>
    </form>
  );
}
