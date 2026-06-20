"use client";

import { useEffect } from "react";

const CART_KEY = "nak_cart";

export function ClearCartOnMount() {
  useEffect(() => {
    window.localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event("nak-cart-updated"));
  }, []);

  return null;
}
