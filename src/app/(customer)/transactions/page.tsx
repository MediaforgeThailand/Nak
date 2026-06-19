import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { compactDate, money } from "@/lib/format";
import { getPayments, getTransactions } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const [transactions, payments] = await Promise.all([getTransactions(), getPayments()]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">ประวัติบัญชี</h2>
          <p className="text-sm text-muted">รายการหนี้จากออเดอร์และเครดิตจากสลิปที่อนุมัติแล้ว</p>
        </div>
        <a className="font-semibold text-accent" href="/payments/new">แจ้งชำระเงิน</a>
      </div>

      <Card>
        <h3 className="font-semibold">Transactions</h3>
        <div className="mt-3 grid gap-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
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
          {transactions.length === 0 ? <p className="text-sm text-muted">ยังไม่มี transaction</p> : null}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">Payment history</h3>
        <div className="mt-3 grid gap-3">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
              <div>
                <p className="font-medium">{payment.payment_number}</p>
                <p className="text-sm text-muted">{compactDate(payment.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(payment.amount)}</p>
                <Badge tone={payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>
                  {payment.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
