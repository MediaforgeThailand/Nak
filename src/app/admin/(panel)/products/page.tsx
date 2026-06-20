import Image from "next/image";
import { PackageSearch } from "lucide-react";
import { createProductAction, updateProductAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Field, Input, Textarea } from "@/components/ui/form";
import { money } from "@/lib/format";
import { getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const products = await getProductsWithInventory(true, "admin");
  const productImageUrls = await signedUrls(
    "product-images",
    products
      .map((product) => product.image_path)
      .filter((path): path is string => Boolean(path)),
    "admin",
  );

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">Product management</h2>
        <p className="text-sm text-muted">MVP ใช้ฟอร์มเร็วสำหรับเพิ่มสินค้าและแก้ข้อมูลหลัก</p>
      </div>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}

      <Card>
        <h3 className="font-semibold">เพิ่มสินค้าใหม่</h3>
        <form action={createProductAction} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="SKU"><Input name="sku" required /></Field>
          <Field label="ชื่อสินค้า"><Input name="name" required /></Field>
          <Field label="ราคา"><Input name="price" type="number" min="0" step="0.01" required /></Field>
          <Field label="หน่วย"><Input name="unit" defaultValue="piece" required /></Field>
          <Field label="สต็อกตั้งต้น"><Input name="quantity_available" type="number" min="0" defaultValue="0" /></Field>
          <Field label="เตือนเมื่อเหลือ"><Input name="low_stock_threshold" type="number" min="0" defaultValue="5" /></Field>
          <div className="sm:col-span-2">
            <Field label="รูปสินค้า">
              <FileUploadPreview
                name="image"
                accept="image/*"
                capture="environment"
                hint="ถ่ายรูปสินค้าหรือเลือกรูปจากเครื่อง"
              />
            </Field>
          </div>
          <Field label="รายละเอียด"><Textarea name="description" className="sm:col-span-2" /></Field>
          <Button type="submit" className="sm:col-span-2">เพิ่มสินค้า</Button>
        </form>
      </Card>

      <div className="grid gap-3">
        {products.map((product) => {
          const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
          const imageUrl = product.image_path ? productImageUrls.get(product.image_path) : null;
          return (
            <Card key={product.id}>
              <form action={updateProductAction} encType="multipart/form-data" className="grid gap-3 lg:grid-cols-[160px_1fr_1fr_120px_100px_120px]">
                <input type="hidden" name="id" value={product.id} />
                <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-md bg-surface-muted text-muted lg:row-span-3">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={product.name}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  ) : (
                    <PackageSearch className="h-8 w-8" />
                  )}
                </div>
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
                <div className="lg:col-span-5">
                  <Field label="เปลี่ยนรูปสินค้า">
                    <FileUploadPreview
                      name="image"
                      accept="image/*"
                      capture="environment"
                      hint="ปล่อยว่างไว้ถ้ายังไม่ต้องการเปลี่ยนรูป"
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-6">
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
