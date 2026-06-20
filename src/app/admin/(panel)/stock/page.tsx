import { adjustInventoryAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { dateTime } from "@/lib/format";
import { getInventoryMovements, getProductsWithInventory } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [products, movements] = await Promise.all([
    getProductsWithInventory(true, "admin"),
    getInventoryMovements(),
  ]);

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">Stock management</h2>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}

      <Card>
        <form action={adjustInventoryAction} className="grid gap-3 sm:grid-cols-[1fr_140px_1fr_auto]">
          <Field label="สินค้า">
            <Select name="product_id" required>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="เพิ่ม/ลด">
            <Input name="quantity_delta" type="number" required />
          </Field>
          <Field label="หมายเหตุ">
            <Input name="note" />
          </Field>
          <Button type="submit" className="self-end">ปรับสต็อก</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold">Stock movement ล่าสุด</h3>
        <div className="mt-3 grid gap-2">
          {movements.map((movement) => (
            <div key={movement.id} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <p className="font-medium">{movement.products?.sku} · {movement.products?.name}</p>
                <p className="text-sm text-muted">{movement.note ?? movement.type}</p>
              </div>
              <p className={movement.quantity_delta > 0 ? "font-semibold text-success" : "font-semibold text-danger"}>
                {movement.quantity_delta > 0 ? "+" : ""}{movement.quantity_delta}
              </p>
              <p className="text-sm text-muted">{dateTime(movement.created_at)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
