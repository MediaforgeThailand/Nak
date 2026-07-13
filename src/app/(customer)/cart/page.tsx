import { CartView } from "@/components/cart/cart-view";
import { SubHeader } from "@/components/nak/sub-header";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses, getMyProductDiscounts, getPriceProgramStatus, getPriceTiers, getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  // Chain the signed-URL lookup off products so it overlaps the other reads.
  const productsP = getProductsWithInventory(false);
  const imageUrlsP = productsP.then((products) =>
    signedUrls("product-images", products.map((product) => product.image_path).filter((path): path is string => Boolean(path))),
  );
  const [{ profile }, products, addresses, priceProgram, productDiscounts, tiers, productImageUrls] = await Promise.all([
    requireCustomer(),
    productsP,
    getCustomerAddresses(),
    getPriceProgramStatus(),
    getMyProductDiscounts(),
    getPriceTiers(),
    imageUrlsP,
  ]);
  const discountPerItem = Number(profile.per_item_discount ?? 0);

  return (
    <>
      <SubHeader title="ตะกร้าและยืนยันออเดอร์" />
      <CartView
        products={products.map((product) => ({
          ...product,
          imageUrl: product.image_path ? productImageUrls.get(product.image_path) ?? null : null,
        }))}
        addresses={addresses}
        tiers={tiers}
        discountPerItem={discountPerItem}
        productDiscounts={productDiscounts}
        floorQuantity={priceProgram.floor_quantity}
        error={params.error}
      />
    </>
  );
}
