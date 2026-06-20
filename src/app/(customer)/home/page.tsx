import { PackageCheck, ShoppingCart, Tags } from "lucide-react";
import { CartView } from "@/components/cart/cart-view";
import { ProductCatalog } from "@/components/products/product-catalog";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCustomerAddresses,
  getProductCategories,
  getProductsWithInventory,
} from "@/lib/data/queries";
import { requireCustomer } from "@/lib/auth";
import { money } from "@/lib/format";
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
  const availableProducts = products.filter((product) => {
    const inventory = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    return Number(inventory?.quantity_available ?? 0) > 0;
  });
  const activeCategoryCount = new Set(
    products.map((product) => product.category_id).filter(Boolean),
  ).size;

  return (
    <div className="grid gap-5">
      <Card className="overflow-hidden p-0">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Catalog พร้อมสั่ง</Badge>
              {discountPerItem > 0 ? (
                <Badge tone="success">ส่วนลดของคุณ {money(discountPerItem)} / ชิ้น</Badge>
              ) : null}
            </div>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
              เลือกสินค้าแฟชั่นจากคลัง แล้วส่งออเดอร์ให้แอดมินอนุมัติ
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              กดดูรายละเอียดสินค้า เพิ่มลงตะกร้า และยืนยันออเดอร์ในหน้าเดียว ระบบจะจองสต็อกทันทีและบันทึกราคาพร้อมส่วนลดของบัญชีนี้ให้ตรวจย้อนหลังได้
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink href="#catalog">
                <Tags className="h-4 w-4" />
                ดูสินค้า
              </ButtonLink>
              <ButtonLink href="#checkout" variant="secondary">
                <ShoppingCart className="h-4 w-4" />
                ยืนยันออเดอร์
              </ButtonLink>
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-white/70 bg-white/68 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-lg border border-teal-200 bg-teal-50 text-accent">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">พร้อมขาย {availableProducts.length} รายการ</p>
                <p className="text-sm leading-6 text-muted">
                  สต็อกและราคาดึงจากฐานข้อมูลจริง ไม่ใช่รายการ mock ในหน้าเว็บ
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-border bg-white/70 p-3">
                <p className="text-muted">หมวดหมู่</p>
                <p className="mt-1 text-xl font-semibold">{activeCategoryCount}</p>
              </div>
              <div className="rounded-lg border border-border bg-white/70 p-3">
                <p className="text-muted">ตะกร้า</p>
                <p className="mt-1 text-xl font-semibold">หน้าเดียว</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

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
            <p className="text-sm text-muted">
              ตรวจรายการ เลือกที่อยู่จัดส่ง และส่งให้แอดมินอนุมัติ
            </p>
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
