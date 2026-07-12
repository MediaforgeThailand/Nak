import QRCode from "qrcode";
import { submitPaymentAction } from "@/app/actions/customer";
import { Icon } from "@/components/nak/icon";
import { SubHeader } from "@/components/nak/sub-header";
import { Badge, NakField } from "@/components/nak/ui";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCustomer } from "@/lib/auth";
import { getPaymentPromptPaySetting } from "@/lib/data/queries";
import { money } from "@/lib/format";
import { buildPromptPayPayload, formatPromptPayId, parsePromptPayId } from "@/lib/promptpay";

export const dynamic = "force-dynamic";

// Scannable PromptPay QR rendered server-side from the admin-configured id.
async function PromptPayQR({ id }: { id: string }) {
  const target = parsePromptPayId(id);
  if (!target) return null;
  const svg = await QRCode.toString(buildPromptPayPayload(target), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#0c2a26", light: "#ffffff" },
  });
  return (
    <div
      aria-label="PromptPay QR"
      style={{ width: 160, height: 160 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, { profile }, promptPay] = await Promise.all([
    searchParams,
    requireCustomer(),
    getPaymentPromptPaySetting(),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const debt = Number(profile.debt_balance ?? 0);
  const promptPayTarget = promptPay ? parsePromptPayId(promptPay.id) : null;

  return (
    <>
      <SubHeader title="แจ้งชำระเงิน" fallbackHref="/profile" />
      <div style={{ display: "grid", gap: 13, padding: "14px 14px 30px" }}>
        {params.error ? (
          <div
            style={{
              background: "#fbe6e3",
              border: "1px solid #f3c8c2",
              padding: "11px 12px",
              borderRadius: "var(--r-sm)",
              color: "#b42318",
              fontSize: 12.5,
            }}
          >
            {params.error}
          </div>
        ) : null}

        <div className="nak-card" style={{ padding: 18, display: "grid", gap: 12, justifyItems: "center", textAlign: "center" }}>
          <Badge tone="accent">
            <Icon name="scan" size={13} stroke={2.4} /> พร้อมเพย์ / โอนเงิน
          </Badge>
          {promptPay && promptPayTarget ? (
            <>
              <div style={{ padding: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
                <PromptPayQR id={promptPay.id} />
              </div>
              <div>
                {promptPay.name ? <div style={{ fontSize: 14, fontWeight: 700 }}>{promptPay.name}</div> : null}
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                  พร้อมเพย์ {formatPromptPayId(promptPayTarget)}
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
              ร้านยังไม่ได้ตั้งค่าบัญชีรับเงินในระบบ
              <br />
              กรุณาสอบถามช่องทางโอนเงินจากร้านโดยตรง แล้วแนบสลิปด้านล่างได้เลย
            </p>
          )}
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#fbeedd",
              borderRadius: "var(--r-sm)",
              padding: "10px 13px",
            }}
          >
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#a35a10" }}>ยอดค้างทั้งหมด</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#a35a10" }}>{money(debt)}</span>
          </div>
        </div>

        <form action={submitPaymentAction} className="nak-card" style={{ padding: 16, display: "grid", gap: 14 }}>
          <NakField label="ยอดโอน">
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 13,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--muted)",
                }}
              >
                ฿
              </span>
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                className="nak-input"
                style={{ paddingLeft: 28, fontSize: 17, fontWeight: 700 }}
                inputMode="decimal"
                defaultValue={debt > 0 ? String(debt) : ""}
                required
              />
            </div>
          </NakField>
          <NakField label="วันที่โอน">
            <input name="transfer_date" type="date" className="nak-input" defaultValue={today} />
          </NakField>
          <NakField label="สลิปโอนเงิน">
            <FileUploadPreview name="slip" accept="image/*,.pdf" capture="environment" required />
          </NakField>
          <NakField label="หมายเหตุ (ถ้ามี)">
            <textarea name="customer_note" rows={2} className="nak-input" placeholder="เช่น โอนจากบัญชีกสิกร..." style={{ resize: "none" }} />
          </NakField>
          <SubmitButton pendingLabel="กำลังส่งสลิป..." className="w-full">
            <Icon name="check" size={18} stroke={2.4} />
            ส่งสลิปให้แอดมินตรวจ
          </SubmitButton>
        </form>
      </div>
    </>
  );
}
