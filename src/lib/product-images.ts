// Group-level product photos bundled in public/products/, matched by SKU
// prefix (see migration 202607110001 for the SKU scheme). Used as a fallback
// wherever a product has no uploaded photo of its own.
const FALLBACKS: Array<[prefix: string, path: string]> = [
  ["MB9K-", "/img/products/marbo9k.webp"],
  ["MSW15K-POD-", "/img/products/mswitch15k-pod.webp"],
  ["MSW15K-SET-", "/img/products/mswitch15k-set.webp"],
  ["MSW15K-DEV-", "/img/products/mswitch15k-device.webp"],
  ["RLXC20K-", "/img/products/relx-creator20k.webp"],
  ["RLXD30K-", "/img/products/relx-diva30k.webp"],
  ["MBAR10K-", "/img/products/mbar10k.webp"],
  ["RLXPOD-", "/img/products/relx-pod.webp"],
];

export function defaultProductImage(sku: string | null | undefined): string | null {
  if (!sku) return null;
  const hit = FALLBACKS.find(([prefix]) => sku.startsWith(prefix));
  return hit ? hit[1] : null;
}
