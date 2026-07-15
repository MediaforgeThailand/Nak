import { AdminOrderBuilder, type BuilderCustomer, type BuilderProduct } from "@/components/nak/admin-order-builder";
import { BackHead } from "@/components/nak/ui";
import { requireAdmin } from "@/lib/auth";
import { getProductsWithInventory, getProfiles } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

type ProductRow = Awaited<ReturnType<typeof getProductsWithInventory>>[number];

export default async function AdminNewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, , profiles, products] = await Promise.all([
    searchParams,
    requireAdmin(),
    getProfiles(),
    getProductsWithInventory(false, "admin"),
  ]);

  const customers: BuilderCustomer[] = profiles
    .filter((p) => p.role === "customer" && p.status === "approved")
    .map((p) => ({ id: p.id, name: p.company_name || p.full_name || p.email || "ลูกค้า" }))
    .sort((a, b) => a.name.localeCompare(b.name, "th"));

  const builderProducts: BuilderProduct[] = (products as ProductRow[]).map((p) => {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    const category = Array.isArray(p.category) ? p.category[0] : p.category;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      price: Number(p.price ?? 0),
      qty: Number(inv?.quantity_available ?? 0),
      categoryName: category?.name ?? "",
    };
  });

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <BackHead title="สร้างออเดอร์แทนลูกค้า" backHref="/admin/orders" />

      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      {customers.length === 0 ? (
        <div className="ad-card" style={{ padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          ยังไม่มีลูกค้าที่อนุมัติแล้ว — อนุมัติลูกค้าก่อนจึงจะสั่งแทนได้
        </div>
      ) : (
        <AdminOrderBuilder customers={customers} products={builderProducts} />
      )}
    </div>
  );
}
