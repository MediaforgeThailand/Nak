import { CreditCard, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { compactDate, money, paymentStatusLabel } from "@/lib/format";
import { getPayments, getTransactions } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [transactions, payments] = await Promise.all([getTransactions(), getPayments()]);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/55 bg-white/70 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-accent">บัญชี</p>
              <h2 className="mt-1 text-2xl font-semibold">ธุรกรรมทั้งหมด</h2>
              <p className="mt-1 text-sm text-muted">รายการหนี้จากออเดอร์และเครดิตจากสลิปที่อนุมัติแล้ว</p>
            </div>
          </div>
          <ButtonLink href="/payments/new">
            <CreditCard className="h-4 w-4" />
            ชำระเงิน
          </ButtonLink>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">รายการบัญชี</h3>
        <div className="mt-3 grid gap-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/48 p-3">
              <div>
                <p className="font-medium">{tx.note ?? tx.type}</p>
                <p className="text-sm text-muted">{compactDate(tx.created_at)}</p>
              </div>
              <div className="text-right">
                <p className={Number(tx.amount) < 0 ? "font-semibold text-success" : "font-semibold text-warning"}>
                  {money(tx.amount)}
                </p>
                <p className="text-xs text-muted">คงเหลือ {money(tx.balance_after)}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 ? <p className="text-sm text-muted">ยังไม่มีรายการบัญชี</p> : null}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">ประวัติการแจ้งชำระ</h3>
        <div className="mt-3 grid gap-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/48 p-3">
              <div>
                <p className="font-medium">{payment.payment_number}</p>
                <p className="text-sm text-muted">{compactDate(payment.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(payment.amount)}</p>
                <Badge tone={payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>
                  {paymentStatusLabel(payment.status)}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
