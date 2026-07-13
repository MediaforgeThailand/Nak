import { CreditSummary } from "@/components/nak/credit-summary";
import { ProductCatalog } from "@/components/products/product-catalog";
import { getMyProductDiscounts, getPriceProgramStatus, getPriceTiers, getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { requireCustomer } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Chain the signed-URL lookup off products so it overlaps the other catalog
  // reads instead of running as a second round-trip after the batch resolves.
  const productsP = getProductsWithInventory(false);
  const imageUrlsP = productsP.then((products) =>
    signedUrls("product-images", products.map((product) => product.image_path).filter((path): path is string => Boolean(path))),
  );
  const [{ profile }, products, categories, priceProgram, productDiscounts, tiers, productImageUrls] = await Promise.all([
    requireCustomer(),
    productsP,
    getProductCategories(),
    getPriceProgramStatus(),
    getMyProductDiscounts(),
    getPriceTiers(),
    imageUrlsP,
  ]);
  const discountPerItem = Number(profile.per_item_discount ?? 0);

  return (
    <div style={{ display: "grid", gap: 14, padding: "14px 14px 20px" }}>
      <CreditSummary
        debtBalance={Number(profile.debt_balance ?? 0)}
        monthQuantity={priceProgram.month_quantity}
      />
      <ProductCatalog
        categories={categories}
        tiers={tiers}
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
