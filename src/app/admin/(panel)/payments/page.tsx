import { approvePaymentAction, recordManualPaymentAction, rejectPaymentAction } from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { AdBadge, AdminTabs, NakField } from "@/components/nak/ui";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireStaff } from "@/lib/auth";
import { getPayments, getProfiles } from "@/lib/data/queries";
import { dateTime, money } from "@/lib/format";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

type PaymentStage = "pending" | "history" | "manual";
type PaymentRow = Awaited<ReturnType<typeof getPayments>>[number];

function normalizeStage(value: string | undefined): PaymentStage {
  return value === "history" || value === "manual" ? value : "pending";
}

function customerLabel(payment: PaymentRow) {
  return payment.customer?.company_name ?? payment.customer?.full_name ?? payment.customer?.email ?? "ไม่ระบุลูกค้า";
}

function PaymentCard({ payment, slipUrl, canAct }: { payment: PaymentRow; slipUrl?: string; canAct: boolean }) {
  const statusTone = payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning";
  const statusLabel = payment.status === "approved" ? "อนุมัติ" : payment.status === "rejected" ? "ปฏิเสธ" : "รอตรวจ";
  return (
    <div className="ad-card" style={{ padding: 16, display: "grid", gap: 13 }}>
      <div style={{ display: "flex", gap: 13 }}>
        <a
          href={slipUrl || undefined}
          target="_blank"
          rel="noreferrer"
          style={{
            width: 64,
            height: 84,
            flexShrink: 0,
            borderRadius: "var(--r-sm)",
            background: slipUrl ? "var(--p-soft)" : "var(--chip)",
            display: "grid",
            placeItems: "center",
            color: slipUrl ? "var(--p-deep)" : "var(--muted)",
            pointerEvents: slipUrl ? "auto" : "none",
          }}
        >
          {slipUrl ? (
            <Icon name="receipt" size={24} stroke={1.8} />
          ) : (
            <span style={{ fontSize: 10, textAlign: "center" }}>
              ไม่มี
              <br />
              สลิป
            </span>
          )}
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>{payment.payment_number}</h3>
            <AdBadge tone={statusTone}>{statusLabel}</AdBadge>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {customerLabel(payment)}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "var(--muted)" }}>{dateTime(payment.created_at)}</p>
          <p style={{ margin: "7px 0 0", fontSize: 21, fontWeight: 800, letterSpacing: "-.01em" }}>{money(payment.amount)}</p>
          {payment.source === "admin_manual" ? (
            <div style={{ marginTop: 5 }}>
              <AdBadge tone="accent">บันทึกโดยทีมงาน</AdBadge>
            </div>
          ) : null}
          {payment.admin_note ? <p style={{ margin: "5px 0 0", fontSize: 12, color: "var(--muted)" }}>หมายเหตุ: {payment.admin_note}</p> : null}
        </div>
      </div>
      {payment.status === "pending" ? (
        canAct ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <form action={approvePaymentAction}>
              <input type="hidden" name="payment_id" value={payment.id} />
              <SubmitButton pendingLabel="..." className="w-full">
                <Icon name="check" size={16} stroke={2.6} /> อนุมัติ
              </SubmitButton>
            </form>
            <form action={rejectPaymentAction}>
              <input type="hidden" name="payment_id" value={payment.id} />
              <SubmitButton variant="secondary" pendingLabel="..." className="w-full" style={{ color: "#b42318" }}>
                <Icon name="x" size={16} stroke={2.6} /> ปฏิเสธ
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
            รอแอดมินตรวจ — บัญชีทีมจัดสินค้าดูได้อย่างเดียว
          </p>
        )
      ) : null}
    </div>
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; stage?: string }>;
}) {
  const params = await searchParams;
  const activeStage = normalizeStage(params.stage);
  const [{ profile }, payments, profiles] = await Promise.all([requireStaff(), getPayments("admin"), getProfiles()]);
  const isAdmin = profile.role === "admin";
  const approvedCustomers = profiles.filter((p) => p.role === "customer" && p.status === "approved");
  const slipPaths = payments
    .map((p) => p.slip_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
  const slipUrls = await signedUrls("payment-slips", slipPaths, "admin");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const historyPayments = payments.filter((p) => p.status !== "pending");
  const visiblePayments = activeStage === "history" ? historyPayments : pendingPayments;

  const tabs = [
    { key: "pending", label: "รอตรวจ", href: "/admin/payments?stage=pending", count: pendingPayments.length },
    { key: "history", label: "ประวัติ", href: "/admin/payments?stage=history", count: 0 },
    { key: "manual", label: "บันทึก", href: "/admin/payments?stage=manual", count: 0 },
  ];

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-.02em" }}>ตรวจสลิปชำระเงิน</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13.5, color: "var(--muted)" }}>อนุมัติ ปฏิเสธ หรือบันทึกเอง</p>
      </div>

      <AdminTabs tabs={tabs} active={activeStage} />

      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      {activeStage === "manual" && !isAdmin ? (
        <div className="ad-card" style={{ padding: 26, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          การบันทึกชำระเงินทำได้เฉพาะบัญชีแอดมิน
        </div>
      ) : activeStage === "manual" ? (
        <form action={recordManualPaymentAction} className="ad-card" style={{ padding: 16, display: "grid", gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>บันทึกชำระเงินโดยทีมงาน</h3>
          <NakField label="ลูกค้า">
            <Select name="customer_id" required>
              <option value="">เลือกลูกค้า</option>
              {approvedCustomers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.company_name ?? p.full_name ?? p.email}
                </option>
              ))}
            </Select>
          </NakField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
            <NakField label="ยอดชำระ">
              <input className="ad-input" name="amount" inputMode="decimal" placeholder="0.00" required />
            </NakField>
            <NakField label="วันที่โอน">
              <input className="ad-input" name="transfer_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </NakField>
          </div>
          <NakField label="แนบสลิป (ไม่บังคับ)">
            <FileUploadPreview name="slip" accept="image/*,application/pdf" hint="แนบรูปหรือ PDF ได้ ถ้าไม่มีให้เว้นว่าง" />
          </NakField>
          <NakField label="หมายเหตุทีมงาน">
            <textarea className="ad-input" name="admin_note" rows={2} style={{ resize: "none" }} />
          </NakField>
          <SubmitButton pendingLabel="กำลังบันทึก..." className="w-full">
            <Icon name="check" size={17} stroke={2.4} /> บันทึกชำระเงิน
          </SubmitButton>
        </form>
      ) : (
        <div style={{ display: "grid", gap: 11 }}>
          {visiblePayments.length === 0 ? (
            <div className="ad-card" style={{ padding: 26, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              {activeStage === "pending" ? "ไม่มีสลิปรอตรวจ" : "ยังไม่มีประวัติ"}
            </div>
          ) : null}
          {visiblePayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              canAct={isAdmin}
              slipUrl={typeof payment.slip_path === "string" ? slipUrls.get(payment.slip_path) ?? undefined : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
