import { createProductAction, updateProductAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { money } from "@/lib/format";
import { getProductsWithInventory } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const products = await getProductsWithInventory(true);

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Product management</h2>
        <p className="text-sm text-muted">MVP ใช้ฟอร์มเร็วสำหรับเพิ่มสินค้าและแก้ข้อมูลหลัก</p>
      </div>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}

      <Card>
        <h3 className="font-semibold">เพิ่มสินค้าใหม่</h3>
        <form action={createProductAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="SKU"><Input name="sku" required /></Field>
          <Field label="ชื่อสินค้า"><Input name="name" required /></Field>
          <Field label="ราคา"><Input name="price" type="number" min="0" step="0.01" required /></Field>
          <Field label="หน่วย"><Input name="unit" defaultValue="piece" required /></Field>
          <Field label="สต็อกตั้งต้น"><Input name="quantity_available" type="number" min="0" defaultValue="0" /></Field>
          <Field label="เตือนเมื่อเหลือ"><Input name="low_stock_threshold" type="number" min="0" defaultValue="5" /></Field>
          <Field label="รายละเอียด"><Textarea name="description" className="sm:col-span-2" /></Field>
          <Button type="submit" className="sm:col-span-2">เพิ่มสินค้า</Button>
        </form>
      </Card>

      <div className="grid gap-3">
        {products.map((product) => {
          const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
          return (
            <Card key={product.id}>
              <form action={updateProductAction} className="grid gap-3 lg:grid-cols-[1fr_1fr_120px_100px_120px]">
                <input type="hidden" name="id" value={product.id} />
                <Field label="ชื่อ"><Input name="name" defaultValue={product.name} /></Field>
                <Field label="SKU"><Input name="sku" defaultValue={product.sku} /></Field>
                <Field label="ราคา"><Input name="price" type="number" step="0.01" defaultValue={product.price} /></Field>
                <Field label="หน่วย"><Input name="unit" defaultValue={product.unit} /></Field>
                <div className="flex items-end gap-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input name="is_active" type="checkbox" defaultChecked={product.is_active} />
                    Active
                  </label>
                </div>
                <div className="lg:col-span-5">
                  <Field label="รายละเอียด"><Textarea name="description" defaultValue={product.description ?? ""} /></Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-5">
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Badge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "active" : "inactive"}</Badge>
                    <span>Stock {inv?.quantity_available ?? 0}</span>
                    <span>{money(product.price)}</span>
                  </div>
                  <Button type="submit" variant="secondary">บันทึก</Button>
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
