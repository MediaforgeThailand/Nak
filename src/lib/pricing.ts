import type { PriceTier } from "@/lib/types";

// Client-side mirror of the pricing rules inside the create_order RPC.
// The DB is authoritative at checkout; these helpers keep the catalog, cart,
// and Price Program page showing the same numbers the order will produce.

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

/** 1-based level reached at `qty` (0 = below the first tier). */
export function levelForQty(tiers: PriceTier[] | null | undefined, qty: number) {
  return sortedTiers(tiers).filter((tier) => qty >= tier.min_quantity).length;
}

/** The next tier above `qty`, or null when already at the top. */
export function nextTier(tiers: PriceTier[] | null | undefined, qty: number) {
  return sortedTiers(tiers).find((tier) => tier.min_quantity > qty) ?? null;
}

/**
 * Final unit price for a line: ladder price at max(quantity, monthly floor)
 * (list price when the product has no ladder), minus the personal per-item
 * discount, never below zero. Must match create_order in the database.
 */
export function effectiveUnitPrice({
  basePrice,
  tiers,
  quantity,
  floorQuantity = 0,
  personalDiscount = 0,
}: {
  basePrice: number;
  tiers?: PriceTier[] | null;
  quantity: number;
  floorQuantity?: number;
  personalDiscount?: number;
}) {
  const effQty = Math.max(quantity, Math.max(floorQuantity, 0));
  const tier = tierForQty(tiers, effQty);
  const base = tier ? Number(tier.unit_price) : Number(basePrice);
  return Math.max(base - Math.max(Number(personalDiscount) || 0, 0), 0);
}
