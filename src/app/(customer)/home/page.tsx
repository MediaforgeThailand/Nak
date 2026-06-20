import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { money, orderStatusLabel, paymentStatusLabel } from "@/lib/format";
import { requireCustomer } from "@/lib/auth";
import { getCustomerOrders, getPayments, getTransactions } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { profile } = await requireCustomer();
  const [orders, payments, transactions] = await Promise.all([
    getCustomerOrders(),
    getPayments(),
    getTransactions(),
  ]);
  const pendingOrders = orders.filter((order) => order.status === "pending_admin").length;
  const pendingPayments = payments.filter((payment) => payment.status === "pending").length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="ยอดหนี้คงเหลือ" value={money(profile.debt_balance)} tone="warning" />
        <StatCard label="ออเดอร์รออนุมัติ" value={String(pendingOrders)} />
        <StatCard label="สลิปรอตรวจ" value={String(pendingPayments)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">ออเดอร์ล่าสุด</h2>
            <ButtonLink href="/products" variant="secondary">สั่งสินค้า</ButtonLink>
          </div>
          <div className="mt-4 grid gap-3">
            {orders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 transition-colors duration-200 hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted">{orderStatusLabel(order.status)}</p>
                </div>
                <p className="font-semibold">{money(order.subtotal)}</p>
              </Link>
            ))}
            {orders.length === 0 ? <p className="text-sm text-muted">ยังไม่มีออเดอร์</p> : null}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">การชำระเงินล่าสุด</h2>
            <ButtonLink href="/payments/new" variant="secondary">แจ้งชำระ</ButtonLink>
          </div>
          <div className="mt-4 grid gap-3">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{payment.payment_number}</p>
                  <p className="font-semibold">{money(payment.amount)}</p>
                </div>
                <p className="text-sm text-muted">{paymentStatusLabel(payment.status)}</p>
              </div>
            ))}
            {transactions.length === 0 && payments.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีประวัติการชำระเงิน</p>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
