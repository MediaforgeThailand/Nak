import { CartView } from "@/components/cart/cart-view";
import { getCustomerAddresses, getProductsWithInventory } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [products, addresses] = await Promise.all([
    getProductsWithInventory(false),
    getCustomerAddresses(),
  ]);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">ตะกร้า / Checkout</h2>
        <p className="text-sm text-muted">ลูกค้าไม่ต้องชำระเงินตอน checkout</p>
      </div>
      <CartView products={products} addresses={addresses} error={params.error} />
    </div>
  );
}
