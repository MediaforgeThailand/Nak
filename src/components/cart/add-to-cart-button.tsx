"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";

const CART_KEY = "nak_cart";

function readCart(): Record<string, number> {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function AddToCartButton({
  productId,
  disabled,
  label = "เพิ่มลงตะกร้า",
  addedLabel = "เพิ่มแล้ว",
  soldOutLabel = "สินค้าหมด",
}: {
  productId: string;
  disabled?: boolean;
  label?: string;
  addedLabel?: string;
  soldOutLabel?: string;
}) {
  const [added, setAdded] = useState(false);
  const isSoldOut = Boolean(disabled);

  return (
    <Button
      type="button"
      disabled={isSoldOut}
      onClick={() => {
        const cart = readCart();
        cart[productId] = (cart[productId] ?? 0) + 1;
        window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event("nak-cart-updated"));
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
      className={clsx("w-full", added && "cart-added-pulse")}
      variant={isSoldOut ? "secondary" : "primary"}
    >
      <ShoppingCart className="h-4 w-4" />
      {isSoldOut ? soldOutLabel : added ? addedLabel : label}
    </Button>
  );
}
