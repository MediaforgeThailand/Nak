import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { dateTime, money, orderStatusLabel } from "@/lib/format";
import { getCustomerOrders } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getCustomerOrders();

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">ออเดอร์ของฉัน</h2>
      <div className="grid gap-3">
        {orders.map((order) => (
          <a key={order.id} href={`/orders/${order.id}`}>
            <Card className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{order.order_number}</h3>
                  <Badge tone={order.status === "rejected" ? "danger" : "accent"}>
                    {orderStatusLabel(order.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{dateTime(order.created_at)}</p>
              </div>
              <p className="text-lg font-semibold">{money(order.subtotal)}</p>
            </Card>
          </a>
        ))}
        {orders.length === 0 ? <Card>ยังไม่มีออเดอร์</Card> : null}
      </div>
    </div>
  );
}
