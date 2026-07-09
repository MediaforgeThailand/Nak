import { PriceProgramView } from "@/components/nak/price-program-view";
import { requireCustomer } from "@/lib/auth";
import { getMyProductDiscounts, getPriceProgramStatus, getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function PriceProgramPage() {
  const [{ profile }, status, products, productDiscounts] = await Promise.all([
    requireCustomer(),
    getPriceProgramStatus(),
    getProductsWithInventory(false),
    getMyProductDiscounts(),
  ]);

  const ladderProducts = products.filter((product) => (product.tiers?.length ?? 0) > 0);
  const imageUrls = await signedUrls(
    "product-images",
    ladderProducts.map((product) => product.image_path).filter((path): path is string => Boolean(path)),
  );

  return (
    <PriceProgramView
      floorQuantity={Number(status.floor_quantity ?? 0)}
      monthQuantity={Number(status.month_quantity ?? 0)}
      lockedFloorQuantity={Number(status.locked_floor_quantity ?? 0)}
      discountPerItem={Number(profile.per_item_discount ?? 0)}
      productDiscounts={productDiscounts}
      products={ladderProducts.map((product) => ({
        id: product.id,
        name: product.name,
        unit: product.unit,
        sku: product.sku,
        price: Number(product.price),
        imageUrl: product.image_path ? imageUrls.get(product.image_path) ?? null : null,
        tiers: product.tiers ?? [],
      }))}
    />
  );
}
