import { ProductCatalog } from "@/components/products/product-catalog";
import { getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([
    getProductsWithInventory(false),
    getProductCategories(),
  ]);
  const productImageUrls = await signedUrls(
    "product-images",
    products
      .map((product) => product.image_path)
      .filter((path): path is string => Boolean(path)),
  );

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">สินค้า</h2>
        <p className="text-sm text-muted">เลือกสินค้า ดูรายละเอียด แล้วเพิ่มลงตะกร้าเพื่อจองสต็อก</p>
      </div>
      <ProductCatalog
        categories={categories}
        products={products.map((product) => ({
          ...product,
          imageUrl: product.image_path ? productImageUrls.get(product.image_path) ?? null : null,
        }))}
      />
    </div>
  );
}
