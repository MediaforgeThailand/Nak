import { submitPaymentAction } from "@/app/actions/customer";
import { Icon } from "@/components/nak/icon";
import { SubHeader } from "@/components/nak/sub-header";
import { Badge, NakField } from "@/components/nak/ui";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCustomer } from "@/lib/auth";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

// deterministic pseudo-QR (visual only)
function FauxQR() {
  const N = 19;
  const finder = (r: number, c: number) =>
    (r < 7 && c < 7) || (r < 7 && c >= N - 7) || (r >= N - 7 && c < 7);
  const inFinder = (r: number, c: number, or: number, oc: number): boolean | null => {
    const rr = r - or;
    const cc = c - oc;
    if (rr < 0 || cc < 0 || rr > 6 || cc > 6) return null;
    if (rr === 0 || rr === 6 || cc === 0 || cc === 6) return true;
    if (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) return true;
    return false;
  };
  const cells: boolean[] = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let on: boolean;
      if (finder(r, c)) {
        const v = inFinder(r, c, 0, 0) ?? inFinder(r, c, 0, N - 7) ?? inFinder(r, c, N - 7, 0);
        on = Boolean(v);
      } else {
        on = (r * 7 + c * 13 + (r ^ c) * 5) % 11 < 5;
      }
      cells.push(on);
    }
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${N}, 1fr)`, gap: 0, width: 150, height: 150 }}>
      {cells.map((on, i) => (
        <div key={i} style={{ background: on ? "#0c2a26" : "transparent" }} />
      ))}
    </div>
  );
}

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, { profile }] = await Promise.all([searchParams, requireCustomer()]);
  const today = new Date().toISOString().slice(0, 10);
  const debt = Number(profile.debt_balance ?? 0);

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
          <div style={{ padding: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: "var(--r-sm)" }}>
            <FauxQR />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>บจก. นาคโฮลเซลล์</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>พร้อมเพย์ 0-9876-54321-0</div>
          </div>
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
