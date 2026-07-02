import type { PriceTier } from "@/lib/types";

// Client-side mirror of the pricing rules inside the create_order RPC.
// Tiers are stored as DISCOUNTS from the product's base price (ราคากลาง), so
// admins can move the base price without touching the ladder. The DB is
// authoritative at checkout; these helpers keep the catalog, cart, and Price
// Program page showing the same numbers the order will produce.

export function sortedTiers(tiers: PriceTier[] | null | undefined) {
  return [...(tiers ?? [])].sort((a, b) => a.min_quantity - b.min_quantity);
}

/** Ladder tier that applies at `qty` (greatest min_quantity <= qty), or null. */
export function tierForQty(tiers: PriceTier[] | null | undefined, qty: number) {
  let hit: PriceTier | null = null;
  for (const tier of sortedTiers(tiers)) {
    if (qty >= tier.min_quantity) hit = tier;
    else break;
  }
  return hit;
}

/** Per-unit ladder discount that applies at `qty` (0 without a ladder). */
export function tierDiscountForQty(tiers: PriceTier[] | null | undefined, qty: number) {
  return Number(tierForQty(tiers, qty)?.discount_amount ?? 0);
}

/** 1-based level reached at `qty` (0 = below the first tier). */
export function levelForQty(tiers: PriceTier[] | null | undefined, qty: number) {
  return sortedTiers(tiers).filter((tier) => qty >= tier.min_quantity).length;
}

/** The next tier above `qty`, or null when already at the top. */
export function nextTier(tiers: PriceTier[] | null | undefined, qty: number) {
  return sortedTiers(tiers).find((tier) => tier.min_quantity > qty) ?? null;
}

/**
 * Ladder discount shown to customers: relative to the FIRST tier (ราคาเริ่ม),
 * e.g. Lv.2 = -10฿. Equals discount_amount when Lv.1 has no discount.
 */
export function tierRelativeDiscount(tiers: PriceTier[] | null | undefined, tier: PriceTier) {
  const first = sortedTiers(tiers)[0];
  return Math.max(Number(tier.discount_amount) - Number(first?.discount_amount ?? 0), 0);
}

/**
 * Final unit price for a line. Must match create_order in the database:
 * max(base - tier_discount(max(qty, floor)) - product_discount - personal, 0)
 */
export function effectiveUnitPrice({
  basePrice,
  tiers,
  quantity,
  floorQuantity = 0,
  personalDiscount = 0,
  productDiscount = 0,
}: {
  basePrice: number;
  tiers?: PriceTier[] | null;
  quantity: number;
  floorQuantity?: number;
  personalDiscount?: number;
  productDiscount?: number;
}) {
  const effQty = Math.max(quantity, Math.max(floorQuantity, 0));
  return Math.max(
    Number(basePrice) -
      tierDiscountForQty(tiers, effQty) -
      Math.max(Number(productDiscount) || 0, 0) -
      Math.max(Number(personalDiscount) || 0, 0),
    0,
  );
}
