"use client";

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
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [added, setAdded] = useState(false);

  return (
    <Button
      type="button"
      disabled={disabled}
      onClick={() => {
        const cart = readCart();
        cart[productId] = (cart[productId] ?? 0) + 1;
        window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
        window.dispatchEvent(new Event("nak-cart-updated"));
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
      className="w-full"
    >
      <ShoppingCart className="h-4 w-4" />
      {added ? "เพิ่มแล้ว" : "เพิ่มลงตะกร้า"}
    </Button>
  );
}
