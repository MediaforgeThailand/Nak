import { CreditSummary } from "@/components/nak/credit-summary";
import { ProductCatalog } from "@/components/products/product-catalog";
import { getMyProductDiscounts, getPriceProgramStatus, getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { requireCustomer } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ profile }, products, categories, priceProgram, productDiscounts] = await Promise.all([
    requireCustomer(),
    getProductsWithInventory(false),
    getProductCategories(),
    getPriceProgramStatus(),
    getMyProductDiscounts(),
  ]);
  const discountPerItem = Number(profile.per_item_discount ?? 0);
  const productImageUrls = await signedUrls(
    "product-images",
    products.map((product) => product.image_path).filter((path): path is string => Boolean(path)),
  );

  return (
    <div style={{ display: "grid", gap: 14, padding: "14px 14px 20px" }}>
      <CreditSummary
        debtBalance={Number(profile.debt_balance ?? 0)}
        monthQuantity={priceProgram.month_quantity}
      />
      <ProductCatalog
        categories={categories}
        discountPerItem={discountPerItem}
        productDiscounts={productDiscounts}
        floorQuantity={priceProgram.floor_quantity}
        products={products.map((product) => ({
          ...product,
          imageUrl: product.image_path ? productImageUrls.get(product.image_path) ?? null : null,
        }))}
      />
    </div>
  );
}
