import { CartView } from "@/components/cart/cart-view";
import { ProductCatalog } from "@/components/products/product-catalog";
import { Badge } from "@/components/ui/badge";
import {
  getCustomerAddresses,
  getProductCategories,
  getProductsWithInventory,
} from "@/lib/data/queries";
import { requireCustomer } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [{ profile }, products, categories, addresses] = await Promise.all([
    requireCustomer(),
    getProductsWithInventory(false),
    getProductCategories(),
    getCustomerAddresses(),
  ]);
  const discountPerItem = Number(profile.per_item_discount ?? 0);
  const productImageUrls = await signedUrls(
    "product-images",
    products
      .map((product) => product.image_path)
      .filter((path): path is string => Boolean(path)),
  );

  return (
    <div className="grid gap-5">
      <section id="catalog" className="scroll-mt-24">
        <ProductCatalog
          categories={categories}
          discountPerItem={discountPerItem}
          products={products.map((product) => ({
            ...product,
            imageUrl: product.image_path ? productImageUrls.get(product.image_path) ?? null : null,
          }))}
        />
      </section>

      <section id="checkout" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">ยืนยันออเดอร์</h2>
          </div>
          <Badge tone="accent">ไม่มีชำระเงินตอน checkout</Badge>
        </div>
        <CartView
          products={products}
          addresses={addresses}
          discountPerItem={discountPerItem}
          error={params.error}
        />
      </section>
    </div>
  );
}
