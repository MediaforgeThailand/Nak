"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Trash2 } from "lucide-react";
import { createOrderAction } from "@/app/actions/customer";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { money } from "@/lib/format";

const CART_KEY = "nak_cart";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number;
  inventory: { quantity_available: number } | { quantity_available: number }[] | null;
};

type AddressRow = {
  id: string;
  label: string;
  recipient_name: string;
  address_line1: string;
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
  error,
}: {
  products: ProductRow[];
  addresses: AddressRow[];
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

  const total = rows.reduce((sum, row) => sum + row.product.price * row.quantity, 0);
  const items = rows.map((row) => ({
    product_id: row.product.id,
    quantity: row.quantity,
  }));

  function updateQuantity(id: string, quantity: number) {
    const next = { ...cart };
    if (quantity <= 0) delete next[id];
    else next[id] = quantity;
    writeCart(next);
  }

  if (rows.length === 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">ตะกร้าว่าง</h2>
        <p className="mt-1 text-sm text-muted">เลือกสินค้าก่อนส่งออเดอร์</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {error}
        </div>
      ) : null}
      <Card>
        <div className="grid gap-3">
          {rows.map(({ product, quantity }) => {
            const stock = qtyAvailable(product);
            return (
              <div
                key={product.id}
                className="grid gap-3 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_120px_44px]"
              >
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="break-words text-sm text-muted">
                    {product.sku} · {money(product.price)} / {product.unit} · คงเหลือ {stock}
                  </p>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={stock}
                  value={quantity}
                  onChange={(event) =>
                    updateQuantity(product.id, Number(event.currentTarget.value))
                  }
                  className="min-h-10 rounded-md border border-border px-3"
                />
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => updateQuantity(product.id, 0)}
                  className="grid h-10 w-10 place-items-center rounded-md border border-border text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <form action={createOrderAction} className="grid gap-4">
          <input type="hidden" name="items" value={JSON.stringify(items)} />
          <Field label="ที่อยู่จัดส่ง">
            <Select name="shipping_address_id" required={addresses.length > 0}>
              <option value="">ไม่ระบุ / ให้ทีมงานติดต่อกลับ</option>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.label} · {address.recipient_name} · {address.address_line1}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="หมายเหตุถึงแอดมิน">
            <Textarea name="customer_note" />
          </Field>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <span className="font-medium">ยอดรวม</span>
            <span className="text-xl font-semibold">{money(total)}</span>
          </div>
          <SubmitButton pendingLabel="กำลังส่งออเดอร์...">
            ส่งออเดอร์และจองสต็อก
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
