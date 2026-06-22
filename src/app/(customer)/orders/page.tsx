import Link from "next/link";
import { ArrowRight, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OrderProgress } from "@/components/orders/order-progress";
import { compactDate, money, orderStatusLabel } from "@/lib/format";
import { getCustomerOrders } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getCustomerOrders();

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/55 bg-white/70 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            <PackageCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-accent">ติดตามออเดอร์</p>
            <h2 className="mt-1 text-2xl font-semibold">สถานะออเดอร์ของฉัน</h2>
          </div>
        </div>
      </Card>

      <div className="grid gap-3">
        {orders.map((order) => (
          <Link key={order.id} href={`/orders/${order.id}`} className="group block">
            <Card className="grid gap-4 transition-all duration-200 group-hover:border-accent/45 group-hover:bg-white/78">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{order.order_number}</h3>
                    <Badge tone={order.status === "rejected" ? "danger" : "accent"}>
                      {orderStatusLabel(order.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{compactDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold">{money(order.subtotal)}</p>
                  {Number(order.total_discount ?? 0) > 0 ? (
                    <p className="text-xs font-semibold text-success">
                      ประหยัด {money(order.total_discount)}
                    </p>
                  ) : null}
                  <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-accent">
                    ดูรายละเอียด
                    <ArrowRight className="h-4 w-4" />
                  </p>
                </div>
              </div>

              <OrderProgress status={order.status} compact />
            </Card>
          </Link>
        ))}
        {orders.length === 0 ? (
          <Card>
            <h3 className="font-semibold">ยังไม่มีออเดอร์</h3>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
