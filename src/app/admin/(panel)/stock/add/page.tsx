import { BackHead } from "@/components/nak/ui";
import { StockAddForm, type StockProduct } from "@/components/nak/stock-add-form";
import { requireAdmin } from "@/lib/auth";
import { getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminStockAddPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; error?: string }>;
}) {
  const [{ product: preselectId, error }] = await Promise.all([searchParams, requireAdmin()]);
  const products = await getProductsWithInventory(true, "admin");

  const imageUrls = await signedUrls(
    "product-images",
    products.map((p) => p.image_path).filter((path): path is string => Boolean(path)),
    "admin",
  );

  const stockProducts: StockProduct[] = products.map((p) => {
    const inv = Array.isArray(p.inventory) ? p.inventory[0] : p.inventory;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unit: p.unit,
      qty: inv?.quantity_available ?? 0,
      imageUrl: p.image_path ? imageUrls.get(p.image_path) ?? null : null,
    };
  });

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <BackHead title="เพิ่มสต็อก" backHref="/admin/stock" />

      {error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {error}
        </div>
      ) : null}

      <StockAddForm products={stockProducts} preselectId={preselectId} />
    </div>
  );
}
