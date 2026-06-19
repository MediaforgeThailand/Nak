import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { money } from "@/lib/format";
import { getProductsWithInventory } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

function stock(product: { inventory: { quantity_available: number } | { quantity_available: number }[] | null }) {
  if (Array.isArray(product.inventory)) return product.inventory[0]?.quantity_available ?? 0;
  return product.inventory?.quantity_available ?? 0;
}

export default async function ProductsPage() {
  const products = await getProductsWithInventory(false);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">สินค้า</h2>
        <p className="text-sm text-muted">เพิ่มลงตะกร้าแล้วส่งออเดอร์เพื่อจองสต็อกทันที</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const qty = stock(product);
          return (
            <Card key={product.id} className="flex flex-col gap-3">
              <div className="aspect-[4/3] rounded-md bg-surface-muted" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted">{product.sku}</p>
                  </div>
                  <Badge tone={qty > 0 ? "success" : "danger"}>
                    {qty > 0 ? `เหลือ ${qty}` : "หมด"}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted">{product.description}</p>
                <p className="mt-3 text-lg font-semibold">{money(product.price)}</p>
              </div>
              <AddToCartButton productId={product.id} disabled={qty <= 0} />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
