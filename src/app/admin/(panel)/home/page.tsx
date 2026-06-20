import { Card, StatCard } from "@/components/ui/card";
import { money, orderStatusLabel } from "@/lib/format";
import { getAdminOrders, getPayments, getProductsWithInventory, getProfiles } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [orders, payments, products, profiles] = await Promise.all([
    getAdminOrders(),
    getPayments("admin"),
    getProductsWithInventory(true, "admin"),
    getProfiles(),
  ]);

  const pendingOrders = orders.filter((order) => order.status === "pending_admin").length;
  const pendingPayments = payments.filter((payment) => payment.status === "pending").length;
  const totalDebt = profiles.reduce((sum, profile) => sum + Number(profile.debt_balance ?? 0), 0);
  const lowStock = products.filter((product) => {
    const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    return inv && inv.quantity_available <= inv.low_stock_threshold;
  }).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="รออนุมัติออเดอร์" value={String(pendingOrders)} tone="warning" />
        <StatCard label="รอตรวจสลิป" value={String(pendingPayments)} tone="warning" />
        <StatCard label="ยอดหนี้รวม" value={money(totalDebt)} tone="danger" />
        <StatCard label="สินค้าใกล้หมด" value={String(lowStock)} />
      </div>

      <Card>
        <h2 className="font-semibold">ออเดอร์ล่าสุด</h2>
        <div className="mt-3 grid gap-3">
          {orders.slice(0, 8).map((order) => (
            <div key={order.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="font-semibold">{order.order_number}</p>
                <p className="text-sm text-muted">
                  {order.customer?.company_name ?? order.customer?.full_name ?? order.customer?.email}
                  {" · "}
                  {orderStatusLabel(order.status)}
                </p>
              </div>
              <p className="font-semibold">{money(order.subtotal)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
