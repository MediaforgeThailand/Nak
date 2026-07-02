import { CartView } from "@/components/cart/cart-view";
import { SubHeader } from "@/components/nak/sub-header";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses, getPriceProgramStatus, getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [{ profile }, products, addresses, priceProgram] = await Promise.all([
    requireCustomer(),
    getProductsWithInventory(false),
    getCustomerAddresses(),
    getPriceProgramStatus(),
  ]);
  const discountPerItem = Number(profile.per_item_discount ?? 0);
  const productImageUrls = await signedUrls(
    "product-images",
    products.map((product) => product.image_path).filter((path): path is string => Boolean(path)),
  );

  return (
    <>
      <SubHeader title="ตะกร้าและยืนยันออเดอร์" />
      <CartView
        products={products.map((product) => ({
          ...product,
          imageUrl: product.image_path ? productImageUrls.get(product.image_path) ?? null : null,
        }))}
        addresses={addresses}
        discountPerItem={discountPerItem}
        floorQuantity={priceProgram.floor_quantity}
        error={params.error}
      />
    </>
  );
}
