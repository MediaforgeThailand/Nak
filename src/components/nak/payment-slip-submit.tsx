"use client";

import { useState } from "react";
import { Icon } from "@/components/nak/icon";
import { NakField } from "@/components/nak/ui";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { SubmitButton } from "@/components/ui/submit-button";

// Slip + note + submit for the payment form. Disables submit while the camera
// photo is still being downscaled, so a fast tap can't submit the full-size
// original and blow past the server-action body limit.
export function PaymentSlipSubmit() {
  const [processing, setProcessing] = useState(false);
  return (
    <>
      <NakField label="สลิปโอนเงิน">
        <FileUploadPreview name="slip" accept="image/*,.pdf" capture="environment" required onProcessingChange={setProcessing} />
      </NakField>
      <NakField label="หมายเหตุ (ถ้ามี)">
        <textarea name="customer_note" rows={2} className="nak-input" placeholder="เช่น โอนจากบัญชีกสิกร..." style={{ resize: "none" }} />
      </NakField>
      <SubmitButton pendingLabel="กำลังส่งสลิป..." className="w-full" disabled={processing}>
        <Icon name="check" size={18} stroke={2.4} />
        {processing ? "กำลังเตรียมรูป..." : "ส่งสลิปให้แอดมินตรวจ"}
      </SubmitButton>
    </>
  );
}
