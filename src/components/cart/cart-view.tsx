"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { createOrderAction } from "@/app/actions/customer";
import { Icon } from "@/components/nak/icon";
import { ProductImage } from "@/components/nak/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { money } from "@/lib/format";
import { effectiveUnitPrice, nextTier } from "@/lib/pricing";
import type { PriceTier, ProductDiscountMap } from "@/lib/types";

const CART_KEY = "nak_cart";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  image_path?: string | null;
  imageUrl?: string | null;
  tiers?: PriceTier[] | null;
  inventory: { quantity_available: number } | { quantity_available: number }[] | null;
};

type AddressRow = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string | null;
  address_line1: string;
  address_line2?: string | null;
  district: string | null;
  province: string | null;
  postal_code: string | null;
  is_default?: boolean;
};

function subscribeCart(callback: () => void) {
  window.addEventListener("nak-cart-updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("nak-cart-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function cartSnapshot() {
  if (typeof window === "undefined") return "{}";
  return window.localStorage.getItem(CART_KEY) ?? "{}";
}

function writeCart(cart: Record<string, number>) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("nak-cart-updated"));
}

function qtyAvailable(product: ProductRow) {
  if (Array.isArray(product.inventory)) return product.inventory[0]?.quantity_available ?? 0;
  return product.inventory?.quantity_available ?? 0;
}

export function CartView({
  products,
  addresses,
  discountPerItem,
  productDiscounts = {},
  floorQuantity = 0,
  error,
}: {
  products: ProductRow[];
  addresses: AddressRow[];
  discountPerItem: number;
  productDiscounts?: ProductDiscountMap;
  floorQuantity?: number;
  error?: string;
}) {
  const snapshot = useSyncExternalStore(subscribeCart, cartSnapshot, () => "{}");
  const cart = useMemo(() => {
    try {
      return JSON.parse(snapshot) as Record<string, number>;
    } catch {
      return {};
    }
  }, [snapshot]);

  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [shippingMethod, setShippingMethod] = useState<"flash" | "grab">("flash");
  const selectedAddress = addresses.find((a) => a.id === addressId) ?? defaultAddress;

  const rows = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = products.find((item) => item.id === id);
          return product ? { product, quantity } : null;
        })
        .filter(Boolean) as { product: ProductRow; quantity: number }[],
    [cart, products],
  );

  const orderableRows = rows
    .map((row) => {
      const stock = qtyAvailable(row.product);
      return stock > 0 ? { ...row, quantity: Math.min(row.quantity, stock), stock } : null;
    })
    .filter(Boolean) as { product: ProductRow; quantity: number; stock: number }[];

  const unitPriceFor = (product: ProductRow, quantity: number) =>
    effectiveUnitPrice({
      basePrice: product.price,
      tiers: product.tiers,
      quantity,
      floorQuantity,
      personalDiscount: discountPerItem,
      productDiscount: Number(productDiscounts[product.id] ?? 0),
    });

  const subtotal = orderableRows.reduce(
    (sum, row) => sum + unitPriceFor(row.product, row.quantity) * row.quantity,
    0,
  );
  const totalBeforeDiscount = orderableRows.reduce(
    (sum, row) => sum + Number(row.product.price) * row.quantity,
    0,
  );
  const totalDiscount = Math.max(totalBeforeDiscount - subtotal, 0);
  const items = orderableRows.map((row) => ({ product_id: row.product.id, quantity: row.quantity }));

  function updateQuantity(id: string, quantity: number, max?: number) {
    const next = { ...cart };
    const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
    if (safeQuantity <= 0) delete next[id];
    else next[id] = Math.min(safeQuantity, max ?? safeQuantity);
    writeCart(next);
  }

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: "60px 24px",
          textAlign: "center",
          color: "var(--muted)",
          display: "grid",
          gap: 12,
          placeItems: "center",
        }}
      >
        <span
          style={{
            width: 56,
            height: 56,
            borderRadius: 999,
            background: "var(--chip)",
            display: "grid",
            placeItems: "center",
            color: "var(--muted)",
          }}
        >
          <Icon name="cart" size={26} />
        </span>
        <div style={{ fontSize: 15, fontWeight: 600 }}>ตะกร้ายังว่างอยู่</div>
        <Link
          href="/home"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderRadius: "var(--r-btn)",
            background: "var(--p-soft)",
            color: "var(--p-deep)",
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          เลือกสินค้า
        </Link>
      </div>
    );
  }

  return (
    <form action={createOrderAction}>
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="shipping_address_id" value={addressId} />
      <input type="hidden" name="shipping_method" value={shippingMethod} />

      <div style={{ display: "grid", gap: 12, padding: "14px 14px 24px" }}>
        {error ? (
          <div
            style={{
              display: "flex",
              gap: 9,
              background: "#fbe6e3",
              border: "1px solid #f3c8c2",
              padding: "11px 12px",
              borderRadius: "var(--r-sm)",
              color: "#b42318",
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            <Icon name="xCircle" size={17} stroke={2.2} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="nak-card" style={{ padding: 6, display: "grid", gap: 2 }}>
          {rows.map((row, idx) => {
            const stock = qtyAvailable(row.product);
            const isSoldOut = stock <= 0;
            const displayQuantity = isSoldOut ? row.quantity : Math.min(row.quantity, stock);
            const finalPrice = unitPriceFor(row.product, displayQuantity);
            const perUnitDiscount = Math.max(Number(row.product.price) - finalPrice, 0);
            const effQty = Math.max(displayQuantity, floorQuantity);
            const upNext = nextTier(row.product.tiers, effQty);
            const qtyToNext = upNext ? upNext.min_quantity - effQty : 0;
            const nextUnitPrice = upNext ? unitPriceFor(row.product, upNext.min_quantity) : 0;
            return (
              <div
                key={row.product.id}
                style={{ display: "flex", gap: 11, padding: 9, borderBottom: idx < rows.length - 1 ? "1px solid var(--line)" : "none" }}
              >
                <div style={{ width: 60, flexShrink: 0 }}>
                  <ProductImage
                    seed={row.product.sku || row.product.id}
                    imageUrl={row.product.imageUrl}
                    alt={row.product.name}
                    ratio="1 / 1"
                    iconSize={26}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "grid", gap: 3 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      color: "var(--ink)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {row.product.name}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    {money(finalPrice)} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)" }}>/ {row.product.unit}</span>
                    {isSoldOut ? <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "#b42318" }}>สินค้าหมด</span> : null}
                  </div>
                  {perUnitDiscount > 0 ? (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#1b7a4b" }}>
                      ลด {money(perUnitDiscount)}/{row.product.unit}
                    </div>
                  ) : null}
                  {!isSoldOut && upNext && qtyToNext > 0 && qtyToNext <= stock ? (
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#1b7a4b" }}>
                      เพิ่มอีก {qtyToNext.toLocaleString("th-TH")} {row.product.unit} → เหลือ {money(nextUnitPrice)}/{row.product.unit}
                    </div>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "center", gap: 0, marginTop: 2 }}>
                    <button
                      type="button"
                      className="nak-step"
                      disabled={isSoldOut}
                      style={{ opacity: isSoldOut ? 0.4 : 1 }}
                      onClick={() => updateQuantity(row.product.id, displayQuantity - 1, stock)}
                    >
                      <Icon name="minus" size={15} stroke={2.6} />
                    </button>
                    <span style={{ width: 34, textAlign: "center", fontSize: 14, fontWeight: 700 }}>{displayQuantity}</span>
                    <button
                      type="button"
                      className="nak-step"
                      disabled={isSoldOut}
                      style={{ opacity: isSoldOut ? 0.4 : 1 }}
                      onClick={() => updateQuantity(row.product.id, displayQuantity + 1, stock)}
                    >
                      <Icon name="plus" size={15} stroke={2.6} />
                    </button>
                    <button
                      type="button"
                      className="nak-step nak-step-del"
                      onClick={() => updateQuantity(row.product.id, 0)}
                      style={{ marginLeft: "auto" }}
                      aria-label="ลบสินค้า"
                    >
                      <Icon name="trash" size={15} stroke={2.2} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="nak-card" style={{ padding: 14, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="pin" size={17} stroke={2.2} style={{ color: "var(--p)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>ที่อยู่จัดส่ง</h3>
          </div>
          {addresses.length > 0 ? (
            <select
              className="nak-input"
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              style={{ marginTop: 2 }}
            >
              <option value="">ไม่ระบุ / ให้ทีมงานติดต่อกลับ</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} · {a.recipient_name}
                </option>
              ))}
            </select>
          ) : (
            <Link href="/profile" style={{ fontSize: 12.5, fontWeight: 700, color: "var(--p)" }}>
              เพิ่มที่อยู่จัดส่ง →
            </Link>
          )}
          {selectedAddress && addressId ? (
            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>
              <div style={{ color: "var(--ink)", fontWeight: 600 }}>
                {selectedAddress.recipient_name}
                {selectedAddress.phone ? ` · ${selectedAddress.phone}` : ""}
              </div>
              <div>{selectedAddress.address_line1}</div>
              <div>{[selectedAddress.district, selectedAddress.province, selectedAddress.postal_code].filter(Boolean).join(" ")}</div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>ไม่ระบุที่อยู่ ทีมงานจะติดต่อกลับเพื่อยืนยันการจัดส่ง</div>
          )}
        </div>

        <div className="nak-card" style={{ padding: 14, display: "grid", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Icon name="truck" size={17} stroke={2.2} style={{ color: "var(--p)" }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>เลือกขนส่ง</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {(
              [
                { key: "flash" as const, icon: "truck", title: "Flash Express", sub: "ส่งทั่วประเทศ" },
                { key: "grab" as const, icon: "bike", title: "Grab", sub: "ส่งด่วนในพื้นที่" },
              ]
            ).map((option) => {
              const on = shippingMethod === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setShippingMethod(option.key)}
                  className="nak-press"
                  style={{
                    display: "grid",
                    justifyItems: "center",
                    gap: 5,
                    padding: "13px 8px",
                    borderRadius: "var(--r-sm)",
                    border: on ? "1.5px solid var(--p)" : "1px solid var(--line)",
                    background: on ? "var(--p-soft)" : "var(--surface)",
                    color: on ? "var(--p-deep)" : "var(--muted)",
                    cursor: "pointer",
                  }}
                >
                  <Icon name={option.icon} size={22} stroke={on ? 2.3 : 2} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: on ? "var(--p-deep)" : "var(--ink)" }}>{option.title}</span>
                  <span style={{ fontSize: 11, fontWeight: 500 }}>{option.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="nak-card" style={{ padding: 14, display: "grid", gap: 9 }}>
          {totalDiscount > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>ยอดก่อนลด</span>
                <span style={{ fontWeight: 600 }}>{money(totalBeforeDiscount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
                <span style={{ color: "var(--muted)" }}>ส่วนลดรวม</span>
                <span style={{ fontWeight: 700, color: "#1b7a4b" }}>-{money(totalDiscount)}</span>
              </div>
              <div style={{ height: 1, background: "var(--line)" }} />
            </>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>ยอดออเดอร์สุทธิ</span>
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-.01em" }}>{money(subtotal)}</span>
          </div>
          <label style={{ display: "grid", gap: 5, marginTop: 2 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>หมายเหตุถึงแอดมิน (ถ้ามี)</span>
            <textarea name="customer_note" rows={2} className="nak-input" style={{ resize: "none" }} />
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "var(--chip)",
              padding: "9px 11px",
              borderRadius: "var(--r-sm)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <Icon name="shield" size={15} stroke={2.2} style={{ color: "var(--p)", flexShrink: 0 }} />
            ไม่มีการชำระเงินตอน checkout — บันทึกเป็นยอดค้างหลังแอดมินอนุมัติ
          </div>
        </div>
      </div>

      <div className="nak-bottombar">
        <div style={{ display: "grid" }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>ยอดสุทธิ</span>
          <span style={{ fontSize: 19, fontWeight: 800 }}>{money(subtotal)}</span>
        </div>
        <SubmitButton disabled={orderableRows.length === 0} pendingLabel="กำลังส่งออเดอร์...">
          <Icon name="check" size={18} stroke={2.4} />
          ยืนยันออเดอร์
        </SubmitButton>
      </div>
    </form>
  );
}
