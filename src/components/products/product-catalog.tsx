"use client";

import Image from "next/image";
import { ArrowLeft, ListFilter, PackageSearch, Search } from "lucide-react";
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
}: {
  products: Product[];
  categories: Category[];
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

  if (selectedProduct) {
    const qty = stock(selectedProduct);
    const soldOut = qty <= 0;

    return (
      <div className="grid gap-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setSelectedProductId(null)}
          className="w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าสินค้า
        </Button>

        <Card className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
          <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-md bg-surface-muted text-muted">
            {selectedProduct.imageUrl ? (
              <Image
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                fill
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover"
              />
            ) : (
              <PackageSearch className="h-12 w-12" />
            )}
          </div>

          <div className="grid content-start gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {selectedProduct.category?.name ? (
                <Badge tone="accent">{selectedProduct.category.name}</Badge>
              ) : (
                <Badge>ไม่ระบุหมวดหมู่</Badge>
              )}
              <Badge tone={soldOut ? "danger" : "success"}>
                {soldOut ? "สินค้าหมด" : `คงเหลือ ${qty} ${selectedProduct.unit}`}
              </Badge>
            </div>

            <div>
              <p className="text-sm text-muted">{selectedProduct.sku}</p>
              <h2 className="mt-1 text-2xl font-semibold leading-tight">{selectedProduct.name}</h2>
              <p className="mt-3 text-2xl font-semibold">{money(selectedProduct.price)}</p>
            </div>

            {selectedProduct.description ? (
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted">
                {selectedProduct.description}
              </p>
            ) : (
              <p className="text-sm text-muted">ยังไม่มีรายละเอียดสินค้า</p>
            )}

            {soldOut ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
                สินค้านี้หมดชั่วคราว ลูกค้าจะไม่สามารถเพิ่มลงตะกร้าได้
              </div>
            ) : null}

            <div className="grid max-w-sm gap-2">
              <AddToCartButton
                productId={selectedProduct.id}
                disabled={soldOut}
                label="เพิ่มเพื่อสั่งซื้อ"
                addedLabel="เพิ่มแล้ว ไปยืนยันออเดอร์"
              />
              <p className="text-xs text-muted">
                เพิ่มสินค้าแล้วไปที่กล่องยืนยันออเดอร์ด้านล่างเพื่อส่งให้แอดมินอนุมัติ
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListFilter className="h-4 w-4" />
            ตัวกรองสินค้า
          </div>
          <span className="text-xs text-muted">แสดง {visibleProducts.length} รายการ</span>
        </div>

        <div className="grid gap-2 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              value={searchText}
              onChange={(event) => setSearchText(event.currentTarget.value)}
              placeholder="ค้นหาชื่อสินค้า / SKU"
              className="pl-9"
            />
          </label>
          <Select value={categoryId} onChange={(event) => setCategoryId(event.currentTarget.value)}>
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
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
      </div>

      {visibleProducts.length === 0 ? (
        <Card>
          <h3 className="font-semibold">ไม่พบสินค้า</h3>
          <p className="mt-1 text-sm text-muted">ลองเปลี่ยนตัวกรองหรือคำค้นหาอีกครั้ง</p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => {
            const qty = stock(product);
            const soldOut = qty <= 0;

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => setSelectedProductId(product.id)}
                className="group grid min-w-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-surface text-left shadow-sm transition-colors duration-200 hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-surface-muted text-muted">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <PackageSearch className="h-9 w-9" />
                  )}
                </div>

                <div className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-muted">{product.sku}</p>
                      <h3 className="line-clamp-2 font-semibold leading-snug">{product.name}</h3>
                    </div>
                    <Badge tone={soldOut ? "danger" : "success"}>
                      {soldOut ? "หมด" : `เหลือ ${qty}`}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{product.category?.name ?? "ไม่ระบุหมวดหมู่"}</span>
                    <span>·</span>
                    <span>{product.unit}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lg font-semibold">{money(product.price)}</span>
                    <span className="text-sm font-semibold text-accent">ดูรายละเอียด</span>
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
