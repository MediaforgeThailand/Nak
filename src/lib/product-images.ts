// Group-level product photos bundled in public/products/, matched by SKU
// prefix (see migration 202607110001 for the SKU scheme). Used as a fallback
// wherever a product has no uploaded photo of its own.
const FALLBACKS: Array<[prefix: string, path: string]> = [
  ["MB9K-", "/products/marbo9k.webp"],
  ["MSW15K-POD-", "/products/mswitch15k-pod.webp"],
  ["MSW15K-SET-", "/products/mswitch15k-set.webp"],
  ["MSW15K-DEV-", "/products/mswitch15k-device.webp"],
  ["RLXC20K-", "/products/relx-creator20k.webp"],
  ["RLXD30K-", "/products/relx-diva30k.webp"],
  ["MBAR10K-", "/products/mbar10k.webp"],
  ["RLXPOD-", "/products/relx-pod.webp"],
];

export function defaultProductImage(sku: string | null | undefined): string | null {
  if (!sku) return null;
  const hit = FALLBACKS.find(([prefix]) => sku.startsWith(prefix));
  return hit ? hit[1] : null;
}
