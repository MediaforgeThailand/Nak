import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { OrderProgress, StatusBadge } from "@/components/nak/ui";
import { compactDate, money } from "@/lib/format";
import { getCustomerOrders } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const orders = await getCustomerOrders();

  return (
    <div style={{ display: "grid", gap: 11, padding: "14px 14px 20px" }}>
      {orders.map((order) => {
        const itemCount = (order.order_items ?? []).length;
        return (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="nak-card nak-press"
            style={{ padding: 14, textAlign: "left", display: "grid", gap: 13 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-.01em" }}>{order.order_number}</span>
                  <StatusBadge status={order.status} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  {compactDate(order.created_at)} · {itemCount} รายการ
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.01em" }}>{money(order.subtotal)}</div>
                {Number(order.total_discount ?? 0) > 0 ? (
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1b7a4b" }}>ประหยัด {money(order.total_discount)}</div>
                ) : null}
              </div>
            </div>
            <OrderProgress status={order.status} compact />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 4,
                color: "var(--p)",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              ดูรายละเอียด <Icon name="arrowR" size={15} stroke={2.4} />
            </div>
          </Link>
        );
      })}
      {orders.length === 0 ? (
        <div className="nak-card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          ยังไม่มีออเดอร์
        </div>
      ) : null}
    </div>
  );
}
