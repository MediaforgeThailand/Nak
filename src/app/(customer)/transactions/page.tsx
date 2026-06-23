import { SubHeader } from "@/components/nak/sub-header";
import { Badge, SectionCard } from "@/components/nak/ui";
import { compactDate, money, paymentStatusLabel } from "@/lib/format";
import { getPayments, getTransactions } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [transactions, payments] = await Promise.all([getTransactions(), getPayments()]);

  return (
    <>
      <SubHeader title="ธุรกรรมทั้งหมด" fallbackHref="/profile" />
      <div style={{ display: "grid", gap: 13, padding: "14px 14px 24px" }}>
        <SectionCard title="รายการบัญชี" icon="receipt">
          {transactions.map((tx, i) => (
            <div
              key={tx.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < transactions.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{tx.note ?? tx.type}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{compactDate(tx.created_at)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: Number(tx.amount) < 0 ? "#1b7a4b" : "#a35a10" }}>
                  {Number(tx.amount) < 0 ? "" : "+"}
                  {money(tx.amount)}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>คงเหลือ {money(tx.balance_after)}</div>
              </div>
            </div>
          ))}
          {transactions.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีรายการบัญชี</p> : null}
        </SectionCard>

        <SectionCard title="ประวัติการแจ้งชำระ" icon="card">
          {payments.map((payment, i) => (
            <div
              key={payment.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderBottom: i < payments.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{payment.payment_number}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{compactDate(payment.created_at)}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{money(payment.amount)}</span>
                <Badge tone={payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>
                  {paymentStatusLabel(payment.status)}
                </Badge>
              </div>
            </div>
          ))}
          {payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีประวัติ</p> : null}
        </SectionCard>
      </div>
    </>
  );
}
