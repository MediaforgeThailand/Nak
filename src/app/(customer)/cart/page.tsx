import { CartView } from "@/components/cart/cart-view";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses, getProductsWithInventory } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [{ profile }, products, addresses] = await Promise.all([
    requireCustomer(),
    getProductsWithInventory(false),
    getCustomerAddresses(),
  ]);
  const discountPerItem = Number(profile.per_item_discount ?? 0);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">ตะกร้า / Checkout</h2>
      </div>
      <CartView
        products={products}
        addresses={addresses}
        discountPerItem={discountPerItem}
        error={params.error}
      />
    </div>
  );
}
