import { ShoppingCart } from "lucide-react";
import { CartView } from "@/components/cart/cart-view";
import { ProductCatalog } from "@/components/products/product-catalog";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCustomerAddresses,
  getProductCategories,
  getProductsWithInventory,
} from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [products, categories, addresses] = await Promise.all([
    getProductsWithInventory(false),
    getProductCategories(),
    getCustomerAddresses(),
  ]);
  const productImageUrls = await signedUrls(
    "product-images",
    products
      .map((product) => product.image_path)
      .filter((path): path is string => Boolean(path)),
  );

  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-accent">หน้าหลัก</p>
            <h2 className="mt-1 text-2xl font-semibold">เลือกสินค้าและส่งออเดอร์</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              ดูรายละเอียดสินค้า เพิ่มลงตะกร้า แล้วกดยืนยันออเดอร์ให้แอดมินอนุมัติจากหน้านี้ได้เลย
            </p>
          </div>
          <ButtonLink href="#checkout" variant="secondary" className="shrink-0">
            <ShoppingCart className="h-4 w-4" />
            ไปยืนยันออเดอร์
          </ButtonLink>
        </div>
      </Card>

      <ProductCatalog
        categories={categories}
        products={products.map((product) => ({
          ...product,
          imageUrl: product.image_path ? productImageUrls.get(product.image_path) ?? null : null,
        }))}
      />

      <section id="checkout" className="scroll-mt-24">
        <div className="mb-3">
          <h2 className="text-xl font-semibold">ยืนยันออเดอร์</h2>
          <p className="text-sm text-muted">
            ตรวจรายการสินค้า เลือกที่อยู่จัดส่ง และส่งให้แอดมินอนุมัติ
          </p>
        </div>
        <CartView products={products} addresses={addresses} error={params.error} />
      </section>
    </div>
  );
}
