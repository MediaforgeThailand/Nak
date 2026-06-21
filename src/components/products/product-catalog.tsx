"use client";

import Image from "next/image";
import {
  ArrowLeft,
  PackageCheck,
  PackageSearch,
  Search,
  ShoppingBag,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { money } from "@/lib/format";

type Category = {
  id: string;
  name: string;
};

type Product = {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  unit: string;
  price: number;
  imageUrl: string | null;
  created_at: string;
  category?: Category | null;
  inventory: { quantity_available: number } | { quantity_available: number }[] | null;
};

function stock(product: Product) {
  if (Array.isArray(product.inventory)) return product.inventory[0]?.quantity_available ?? 0;
  return product.inventory?.quantity_available ?? 0;
}

function discountPerUnit(price: number, discountPerItem: number) {
  return Math.min(Math.max(Number(discountPerItem) || 0, 0), Number(price) || 0);
}

function discountedUnitPrice(price: number, discountPerItem: number) {
  return Math.max((Number(price) || 0) - discountPerUnit(price, discountPerItem), 0);
}

function sortProducts(products: Product[], sortBy: string) {
  return [...products].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name, "th");
    if (sortBy === "price_low") return Number(a.price) - Number(b.price);
    if (sortBy === "price_high") return Number(b.price) - Number(a.price);
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function ProductCatalog({
  products,
  categories,
  discountPerItem,
}: {
  products: Product[];
  categories: Category[];
  discountPerItem: number;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("all");
  const [stockFilter, setStockFilter] = useState("available");
  const [sortBy, setSortBy] = useState("latest");
  const [searchText, setSearchText] = useState("");

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const activeCategories = useMemo(() => {
    const categoryIds = new Set(products.map((product) => product.category_id).filter(Boolean));
    return categories.filter((category) => categoryIds.has(category.id));
  }, [categories, products]);

  const visibleProducts = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const productStock = stock(product);
      const matchesCategory = categoryId === "all" || product.category_id === categoryId;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "available" && productStock > 0) ||
        (stockFilter === "sold_out" && productStock <= 0);
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query);

      return matchesCategory && matchesStock && matchesSearch;
    });

    return sortProducts(filtered, sortBy);
  }, [categoryId, products, searchText, sortBy, stockFilter]);

  const availableCount = products.filter((product) => stock(product) > 0).length;

  if (selectedProduct) {
    const qty = stock(selectedProduct);
    const soldOut = qty <= 0;
    const unitDiscount = discountPerUnit(selectedProduct.price, discountPerItem);
    const finalPrice = discountedUnitPrice(selectedProduct.price, discountPerItem);

    return (
      <div className="motion-page grid gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setSelectedProductId(null)}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปเลือกสินค้า
        </Button>

        <Card className="overflow-hidden p-0">
          <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.8fr)]">
            <div className="relative min-h-[420px] overflow-hidden bg-[#eef3ef]">
              {selectedProduct.imageUrl ? (
                <Image
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 54vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full min-h-[420px] place-items-center text-muted">
                  <PackageSearch className="h-12 w-12" />
                </div>
              )}
              {soldOut ? (
                <div className="absolute inset-0 grid place-items-center bg-white/62 backdrop-blur-sm">
                  <Badge tone="danger">สินค้าหมด</Badge>
                </div>
              ) : null}
            </div>

            <div className="grid content-start gap-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                {selectedProduct.category?.name ? (
                  <Badge tone="accent">{selectedProduct.category.name}</Badge>
                ) : (
                  <Badge>ไม่ระบุหมวดหมู่</Badge>
                )}
                <Badge tone={soldOut ? "danger" : "success"}>
                  {soldOut ? "สินค้าหมด" : `พร้อมส่ง ${qty} ${selectedProduct.unit}`}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted">{selectedProduct.sku}</p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight">
                  {selectedProduct.name}
                </h2>
                <div className="mt-4 grid gap-1">
                  {unitDiscount > 0 ? (
                    <p className="text-sm text-muted line-through">{money(selectedProduct.price)}</p>
                  ) : null}
                  <p className="text-3xl font-semibold">{money(finalPrice)}</p>
                  {unitDiscount > 0 ? (
                    <p className="text-sm font-semibold text-success">
                      ส่วนลดเฉพาะบัญชีคุณ {money(unitDiscount)} / ชิ้น
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border border-border bg-white/70 p-4">
                <div className="flex items-start gap-3">
                  <PackageCheck className="mt-0.5 h-5 w-5 text-accent" />
                  <div>
                    <p className="font-semibold">สต็อกพร้อมจองทันที</p>
                    <p className="text-sm leading-6 text-muted">
                      เมื่อส่งออเดอร์ ระบบจะจองสต็อกและส่งให้แอดมินอนุมัติก่อนคิดยอดค้างชำระ
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShoppingBag className="mt-0.5 h-5 w-5 text-accent" />
                  <div>
                    <p className="font-semibold">เหมาะสำหรับสั่งซ้ำและขายต่อ</p>
                    <p className="text-sm leading-6 text-muted">
                      ราคาและส่วนลดถูกบันทึกลงออเดอร์ทุกครั้ง เพื่อให้ตรวจย้อนหลังได้ชัดเจน
                    </p>
                  </div>
                </div>
              </div>

              {selectedProduct.description ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                  {selectedProduct.description}
                </p>
              ) : (
                <p className="text-sm text-muted">ยังไม่มีรายละเอียดสินค้า</p>
              )}

              {soldOut ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-danger">
                  สินค้านี้หมดชั่วคราว ลูกค้าจะไม่สามารถเพิ่มลงตะกร้าหรือส่งออเดอร์ได้
                </div>
              ) : null}

              <div className="grid max-w-sm gap-2">
                <AddToCartButton
                  productId={selectedProduct.id}
                  disabled={soldOut}
                  label="เพิ่มลงตะกร้า"
                  addedLabel="เพิ่มแล้ว ไปยืนยันออเดอร์"
                />
                <p className="text-xs leading-5 text-muted">
                  หลังเพิ่มสินค้าแล้วเลื่อนลงไปยืนยันออเดอร์ ระบบจะส่งรายการให้แอดมินอนุมัติ
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <div>
              <h2 className="font-semibold">ค้นหาและกรองสินค้า</h2>
              <p className="text-sm text-muted">
                แสดง {visibleProducts.length} รายการ จากสินค้าพร้อมขาย {availableCount} รายการ
              </p>
            </div>
          </div>
          {discountPerItem > 0 ? (
            <Badge tone="success">ส่วนลดบัญชีคุณ {money(discountPerItem)} / ชิ้น</Badge>
          ) : null}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={categoryId === "all"}
            onClick={() => setCategoryId("all")}
            className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${
              categoryId === "all"
                ? "border-accent bg-accent text-white"
                : "border-border bg-white/68 text-muted hover:bg-white"
            }`}
          >
            ทั้งหมด
          </button>
          {activeCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => setCategoryId(category.id)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-200 ${
                categoryId === category.id
                  ? "border-accent bg-accent text-white"
                  : "border-border bg-white/68 text-muted hover:bg-white"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
              placeholder="ค้นหาชื่อสินค้า / SKU / หมวดหมู่"
              className="pl-9"
            />
          </label>
          <Select value={stockFilter} onChange={(event) => setStockFilter(event.currentTarget.value)}>
            <option value="available">มีสินค้า</option>
            <option value="all">ทั้งหมด</option>
            <option value="sold_out">สินค้าหมด</option>
          </Select>
          <Select value={sortBy} onChange={(event) => setSortBy(event.currentTarget.value)}>
            <option value="latest">ล่าสุด</option>
            <option value="name">ชื่อสินค้า A-Z</option>
            <option value="price_low">ราคาต่ำไปสูง</option>
            <option value="price_high">ราคาสูงไปต่ำ</option>
          </Select>
        </div>
      </Card>

      {visibleProducts.length === 0 ? (
        <Card>
          <h3 className="font-semibold">ไม่พบสินค้า</h3>
          <p className="mt-1 text-sm text-muted">ลองเปลี่ยนตัวกรองหรือคำค้นหาอีกครั้ง</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {visibleProducts.map((product, index) => {
            const qty = stock(product);
            const soldOut = qty <= 0;
            const unitDiscount = discountPerUnit(product.price, discountPerItem);
            const finalPrice = discountedUnitPrice(product.price, discountPerItem);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProductId(product.id)}
                className="motion-surface group grid min-w-0 cursor-pointer overflow-hidden rounded-lg border border-white/70 bg-white/84 text-left shadow-[0_16px_34px_rgba(31,65,58,0.1)] transition-all duration-200 hover:border-accent/60 hover:bg-white/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="relative grid aspect-[3/4] place-items-center overflow-hidden bg-[#edf2ef] text-muted">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      priority={index < 2}
                      sizes="(min-width: 1024px) 30vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                    />
                  ) : (
                    <PackageSearch className="h-9 w-9" />
                  )}
                  <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                    <Badge tone={soldOut ? "danger" : "success"}>
                      {soldOut ? "หมด" : `เหลือ ${qty}`}
                    </Badge>
                  </div>
                  {product.category?.name ? (
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="inline-flex max-w-full rounded-full border border-white/70 bg-white/82 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm backdrop-blur-xl">
                        <span className="truncate">{product.category.name}</span>
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 p-3 sm:p-4">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-muted">{product.sku}</p>
                    <h3 className="mt-1 line-clamp-2 min-h-[2.75rem] font-semibold leading-snug">
                      {product.name}
                    </h3>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <span className="grid gap-0.5">
                      {unitDiscount > 0 ? (
                        <span className="text-xs text-muted line-through">{money(product.price)}</span>
                      ) : null}
                      <span className="text-lg font-semibold">{money(finalPrice)}</span>
                      {unitDiscount > 0 ? (
                        <span className="text-xs font-semibold text-success">
                          ลด {money(unitDiscount)} / ชิ้น
                        </span>
                      ) : (
                        <span className="text-xs text-muted">ต่อ {product.unit}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-accent sm:text-sm">
                      ดูสินค้า
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
