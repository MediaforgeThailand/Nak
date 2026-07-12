import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { AdBadge, AdThumb, Avatar, PageHead, StatTile } from "@/components/nak/ui";
import { money } from "@/lib/format";
import { getAdminOrders, getPayments, getProductsWithInventory, getProfiles } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

type AdminOrder = Awaited<ReturnType<typeof getAdminOrders>>[number];

function inventoryOf(product: Awaited<ReturnType<typeof getProductsWithInventory>>[number]) {
  return Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
}

function customerName(order: AdminOrder) {
  return order.customer?.company_name ?? order.customer?.full_name ?? order.customer?.email ?? "ไม่ระบุลูกค้า";
}

function stageMeta(status: string) {
  if (status === "pending_admin") return { label: "รออนุมัติ", color: "#a35a10" };
  if (["approved", "packing"].includes(status)) return { label: "จัดสินค้า", color: "var(--p-deep)" };
  if (status === "ready_to_ship") return { label: "รอส่งขนส่ง", color: "var(--p-deep)" };
  if (["shipping", "delivered"].includes(status)) return { label: "ส่งแล้ว", color: "#1b7a4b" };
  return { label: "—", color: "var(--muted)" };
}

function ActionRow({
  icon,
  tone,
  label,
  count,
  href,
}: {
  icon: string;
  tone: "warning" | "accent";
  label: string;
  count: number;
  href: string;
}) {
  const soft = tone === "warning" ? "#fbeedd" : "var(--p-soft)";
  const fg = tone === "warning" ? "#a35a10" : "var(--p-deep)";
  return (
    <Link
      href={href}
      className="ad-press"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "11px 12px",
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        textAlign: "left",
        width: "100%",
      }}
    >
      <span style={{ width: 34, height: 34, borderRadius: 10, background: soft, color: fg, display: "grid", placeItems: "center", flexShrink: 0 }}>
        <Icon name={icon} size={17} stroke={2.2} />
      </span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: count > 0 ? "#a35a10" : "var(--muted)" }}>{count}</span>
      <Icon name="chevR" size={17} stroke={2.4} style={{ color: "var(--muted)" }} />
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [orders, payments, products, profiles] = await Promise.all([
    getAdminOrders(),
    getPayments("admin"),
    getProductsWithInventory(true, "admin"),
    getProfiles(),
  ]);

  const pendingOrders = orders.filter((order) => order.status === "pending_admin").length;
  const pendingSlips = payments.filter((payment) => payment.status === "pending").length;
  const totalDebt = profiles.reduce((sum, profile) => sum + Number(profile.debt_balance ?? 0), 0);
  const requests = profiles.filter((p) => p.status === "pending").length;
  const lowStock = products.filter((product) => {
    const inv = inventoryOf(product);
    return inv && inv.quantity_available <= inv.low_stock_threshold;
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PageHead title="แดชบอร์ด" sub="งานที่ต้องจัดการวันนี้" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        <StatTile icon="clipboard" label="รออนุมัติออเดอร์" value={String(pendingOrders)} tone="warning" />
        <StatTile icon="wallet" label="รอตรวจสลิป" value={String(pendingSlips)} tone="warning" />
        <StatTile icon="trending" label="ยอดหนี้รวม" value={money(totalDebt)} tone="danger" />
        <StatTile icon="alert" label="สินค้าใกล้หมด" value={String(lowStock.length)} tone="neutral" />
      </div>

      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>ต้องดำเนินการ</h3>
        <ActionRow icon="clipboard" tone="warning" label="อนุมัติออเดอร์" count={pendingOrders} href="/admin/orders?stage=approve" />
        <ActionRow icon="wallet" tone="warning" label="ตรวจสลิปชำระเงิน" count={pendingSlips} href="/admin/payments?stage=pending" />
        <ActionRow icon="users" tone="accent" label="คำขอเปิดบัญชี" count={requests} href="/admin/users" />
      </div>

      <div className="ad-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>ออเดอร์ล่าสุด</h3>
          <Link href="/admin/orders" className="ad-link">
            ดูทั้งหมด <Icon name="arrowR" size={14} stroke={2.4} />
          </Link>
        </div>
        {orders.slice(0, 5).map((order, i) => {
          const stage = stageMeta(order.status);
          return (
            <div
              key={order.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "10px 0",
                borderBottom: i < Math.min(orders.length, 5) - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <Avatar name={customerName(order)} tone="neutral" size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{order.order_number}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {customerName(order)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>{money(order.subtotal)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: stage.color }}>{stage.label}</div>
              </div>
            </div>
          );
        })}
        {orders.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0 0" }}>ยังไม่มีออเดอร์</p> : null}
      </div>

      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 6 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15.5, fontWeight: 700 }}>สินค้าใกล้หมด</h3>
        {lowStock.map((product, i) => {
          const inv = inventoryOf(product);
          const qty = inv?.quantity_available ?? 0;
          return (
            <div
              key={product.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "8px 0",
                borderBottom: i < lowStock.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <AdThumb name={product.name} size={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.name}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{product.sku}</div>
              </div>
              <AdBadge tone={qty === 0 ? "danger" : "warning"}>{qty === 0 ? "หมด" : `เหลือ ${qty}`}</AdBadge>
            </div>
          );
        })}
        {lowStock.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0" }}>สต็อกเพียงพอทุกรายการ</p> : null}
      </div>
    </div>
  );
}
