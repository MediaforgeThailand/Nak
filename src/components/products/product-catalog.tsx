"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/nak/icon";
import { Badge, ProductImage } from "@/components/nak/ui";
import { money } from "@/lib/format";
import { effectiveUnitPrice, levelForQty, sortedTiers, tierRelativeDiscount } from "@/lib/pricing";
import type { PriceTier, ProductDiscountMap } from "@/lib/types";

const CART_KEY = "nak_cart";

type Category = { id: string; name: string };

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

function addToCart(productId: string, quantity = 1) {
  let cart: Record<string, number> = {};
  try {
    cart = JSON.parse(window.localStorage.getItem(CART_KEY) ?? "{}") as Record<string, number>;
  } catch {
    cart = {};
  }
  cart[productId] = (cart[productId] ?? 0) + quantity;
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("nak-cart-updated"));
  window.dispatchEvent(new CustomEvent("nak-toast", { detail: "เพิ่มลงตะกร้าแล้ว" }));
}

function ProductCard({
  product,
  tiers,
  discountPerItem,
  productDiscount,
  floorQuantity,
  onOpen,
}: {
  product: Product;
  tiers: PriceTier[];
  discountPerItem: number;
  productDiscount: number;
  floorQuantity: number;
  onOpen: (id: string) => void;
}) {
  const qty = stock(product);
  const soldOut = qty <= 0;
  const low = qty > 0 && qty < 25;
  const hasTiers = tiers.length > 0;
  const finalPrice = effectiveUnitPrice({
    basePrice: product.price,
    tiers,
    quantity: 1,
    floorQuantity,
    personalDiscount: discountPerItem,
    productDiscount,
  });

  return (
    <button
      type="button"
      className="nak-card nak-press"
      onClick={() => onOpen(product.id)}
      style={{ padding: 0, overflow: "hidden", textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column" }}
    >
      <div style={{ position: "relative", padding: 8, paddingBottom: 0 }}>
        <ProductImage seed={product.sku || product.id} imageUrl={product.imageUrl} alt={product.name} ratio="1 / 1" />
        <div style={{ position: "absolute", top: 13, left: 13 }}>
          <Badge tone={soldOut ? "danger" : low ? "warning" : "success"} size="sm">
            {soldOut ? "สินค้าหมด" : `เหลือ ${qty}`}
          </Badge>
        </div>
      </div>
      <div style={{ padding: "9px 11px 11px", display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", letterSpacing: ".02em" }}>{product.sku}</div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            lineHeight: 1.35,
            color: "var(--ink)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: 35,
          }}
        >
          {product.name}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 6 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)", letterSpacing: "-.01em" }}>{money(finalPrice)}</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>ต่อ {product.unit}</div>
            {hasTiers ? (
              <div style={{ marginTop: 3, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, fontWeight: 700, color: "#1b7a4b" }}>
                <Icon name="trending" size={11} stroke={2.6} /> ยิ่งซื้อมาก ยิ่งถูก
              </div>
            ) : null}
          </div>
          <span
            role="button"
            tabIndex={soldOut ? -1 : 0}
            onClick={(e) => {
              e.stopPropagation();
              if (!soldOut) addToCart(product.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                if (!soldOut) addToCart(product.id);
              }
            }}
            className="nak-addbtn"
            aria-label="เพิ่มลงตะกร้า"
            aria-disabled={soldOut}
            style={{ opacity: soldOut ? 0.3 : 1, pointerEvents: soldOut ? "none" : "auto" }}
          >
            <Icon name="plus" size={18} stroke={2.6} />
          </span>
        </div>
      </div>
    </button>
  );
}

function ProductDetail({
  product,
  tiers: rawTiers,
  discountPerItem,
  productDiscount,
  floorQuantity,
  onClose,
}: {
  product: Product;
  tiers: PriceTier[];
  discountPerItem: number;
  productDiscount: number;
  floorQuantity: number;
  onClose: () => void;
}) {
  const qty = stock(product);
  const soldOut = qty <= 0;
  const tiers = sortedTiers(rawTiers);
  const [orderQty, setOrderQty] = useState(1);
  const clampedQty = Math.min(Math.max(orderQty, 1), Math.max(qty, 1));
  const effQty = Math.max(clampedQty, floorQuantity);
  const activeLevel = tiers.length > 0 ? levelForQty(tiers, Math.max(effQty, 1)) : 0;
  const startPrice =
    tiers.length > 0
      ? effectiveUnitPrice({
          basePrice: product.price,
          tiers,
          quantity: tiers[0].min_quantity,
          floorQuantity: 0,
          personalDiscount: discountPerItem,
          productDiscount,
        })
      : 0;
  const finalPrice = effectiveUnitPrice({
    basePrice: product.price,
    tiers,
    quantity: clampedQty,
    floorQuantity,
    personalDiscount: discountPerItem,
    productDiscount,
  });
  const lineTotal = finalPrice * clampedQty;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: "100%",
          overflowY: "auto",
          background: "var(--bg)",
          position: "relative",
        }}
      >
        <div className="nak-subheader">
          <button onClick={onClose} className="nak-iconbtn" aria-label="ย้อนกลับ" type="button">
            <Icon name="chevL" size={20} stroke={2.4} />
          </button>
          <h2 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: "-.01em" }}>รายละเอียดสินค้า</h2>
        </div>

        <div className="motion-page" style={{ display: "grid", gap: 14, padding: "14px 14px 110px" }}>
          <div className="nak-card" style={{ padding: 10 }}>
            <ProductImage
              seed={product.sku || product.id}
              imageUrl={product.imageUrl}
              alt={product.name}
              ratio="4 / 3"
              iconSize={72}
              radius="calc(var(--r-sm) - 2px)"
            />
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.category?.name ? <Badge tone="accent">{product.category.name}</Badge> : <Badge>ไม่ระบุหมวดหมู่</Badge>}
              <Badge tone={soldOut ? "danger" : "success"}>{soldOut ? "สินค้าหมด" : `พร้อมส่ง ${qty} ${product.unit}`}</Badge>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{product.sku}</div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-.01em" }}>{product.name}</h2>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-.02em" }}>{money(finalPrice)}</span>
              <span style={{ fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>/ {product.unit}</span>
            </div>
          </div>

          {/* quantity picker — price updates live with the ladder */}
          {!soldOut ? (
            <div className="nak-card" style={{ padding: 14, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>จำนวนที่สั่ง</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    className="nak-step"
                    style={{ width: 38, height: 38 }}
                    onClick={() => setOrderQty(Math.max(clampedQty - 1, 1))}
                    aria-label="ลดจำนวน"
                  >
                    <Icon name="minus" size={16} stroke={2.6} />
                  </button>
                  <input
                    className="nak-input"
                    inputMode="numeric"
                    value={clampedQty}
                    onChange={(e) => {
                      const v = Number(e.target.value.replace(/\D/g, ""));
                      setOrderQty(Number.isFinite(v) && v > 0 ? v : 1);
                    }}
                    style={{ width: 72, textAlign: "center", padding: "9px 4px", fontSize: 16, fontWeight: 700 }}
                  />
                  <button
                    type="button"
                    className="nak-step"
                    style={{ width: 38, height: 38 }}
                    onClick={() => setOrderQty(Math.min(clampedQty + 1, qty))}
                    aria-label="เพิ่มจำนวน"
                  >
                    <Icon name="plus" size={16} stroke={2.6} />
                  </button>
                </div>
              </div>
              {tiers.length > 0 && activeLevel > 0 ? (
                <div style={{ fontSize: 12, fontWeight: 600, color: "#1b7a4b" }}>
                  ตอนนี้อยู่ Lv.{activeLevel} — ราคา {money(finalPrice)}/{product.unit}
                </div>
              ) : null}
            </div>
          ) : null}

          {tiers.length > 0 ? (
            <div className="nak-card" style={{ padding: 15, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Icon name="trending" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, flex: 1 }}>ราคาตามจำนวน — ยิ่งซื้อมาก ยิ่งถูก</h3>
              </div>
              <div style={{ display: "grid", gap: 4 }}>
                {tiers.map((tier, i) => {
                  const level = i + 1;
                  const isActive = level === activeLevel;
                  return (
                    <div
                      key={tier.min_quantity}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 10,
                        background: isActive ? "var(--p-soft)" : "transparent",
                        border: isActive ? "1px solid var(--p)" : "1px solid transparent",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: isActive ? "#fff" : "var(--muted)",
                          background: isActive ? "var(--p)" : "var(--chip)",
                          borderRadius: 999,
                          padding: "3px 8px",
                          flexShrink: 0,
                        }}
                      >
                        Lv.{level}
                      </span>
                      <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: isActive ? "var(--p-deep)" : "var(--ink)" }}>
                        {tier.min_quantity.toLocaleString("th-TH")}+ {product.unit}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: i === 0 ? (isActive ? "var(--p-deep)" : "var(--ink)") : "#1b7a4b",
                        }}
                      >
                        {i === 0 ? `ราคาเริ่ม ${money(startPrice)}` : `-${money(tierRelativeDiscount(tiers, tier))}`}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Link
                href="/price-program"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, color: "var(--p)" }}
              >
                ซื้อสะสมรายเดือนเพื่อล็อกราคาขั้นสูง <Icon name="arrowR" size={13} stroke={2.6} />
              </Link>
            </div>
          ) : null}

          <div className="nak-card" style={{ padding: 15, display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>รายละเอียด</h3>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
              {product.description || "ยังไม่มีรายละเอียดสินค้า"}
            </p>
          </div>
        </div>

        <div className="nak-bottombar">
          <div style={{ display: "grid" }}>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              รวม {clampedQty.toLocaleString("th-TH")} {product.unit}
            </span>
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>{money(lineTotal)}</span>
          </div>
          <button
            type="button"
            disabled={soldOut}
            onClick={() => addToCart(product.id, clampedQty)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "13px 18px",
              border: "1px solid transparent",
              borderRadius: "var(--r-btn)",
              background: "var(--p)",
              color: "#fff",
              fontSize: 15,
              fontWeight: 700,
              cursor: soldOut ? "not-allowed" : "pointer",
              opacity: soldOut ? 0.45 : 1,
              boxShadow: soldOut ? "none" : "0 6px 16px -6px var(--p)",
            }}
          >
            <Icon name="cart" size={18} stroke={2.2} />
            {soldOut ? "สินค้าหมด" : "เพิ่มลงตะกร้า"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProductCatalog({
  products,
  categories,
  tiers = [],
  discountPerItem,
  productDiscounts = {},
  floorQuantity = 0,
}: {
  products: Product[];
  categories: Category[];
  tiers?: PriceTier[];
  discountPerItem: number;
  productDiscounts?: ProductDiscountMap;
  floorQuantity?: number;
}) {
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const activeCats = useMemo(() => {
    const ids = new Set(products.map((p) => p.category_id).filter(Boolean));
    return categories.filter((c) => ids.has(c.id));
  }, [products, categories]);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      const mc = cat === "all" || p.category_id === cat;
      const ms =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        (p.category?.name?.toLowerCase().includes(query) ?? false);
      return mc && ms;
    });
  }, [products, cat, q]);

  const selected = openId ? products.find((p) => p.id === openId) ?? null : null;

  useEffect(() => {
    if (!selected) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selected]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="nak-search">
        <Icon name="search" size={18} stroke={2.2} style={{ color: "var(--muted)" }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสินค้า / SKU" />
      </div>

      <div className="nak-chiprow">
        {[{ id: "all", name: "ทั้งหมด" }, ...activeCats].map((c) => (
          <button key={c.id} type="button" onClick={() => setCat(c.id)} className={"nak-chip" + (cat === c.id ? " is-on" : "")}>
            {c.name}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>สินค้าทั้งหมด</h3>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{list.length} รายการ</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}>
        {list.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            tiers={tiers}
            discountPerItem={discountPerItem}
            productDiscount={Number(productDiscounts[p.id] ?? 0)}
            floorQuantity={floorQuantity}
            onOpen={setOpenId}
          />
        ))}
      </div>
      {list.length === 0 && (
        <div className="nak-card" style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          ไม่พบสินค้า
        </div>
      )}

      {selected && typeof document !== "undefined"
        ? createPortal(
            <ProductDetail
              key={selected.id}
              product={selected}
              tiers={tiers}
              discountPerItem={discountPerItem}
              productDiscount={Number(productDiscounts[selected.id] ?? 0)}
              floorQuantity={floorQuantity}
              onClose={() => setOpenId(null)}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
