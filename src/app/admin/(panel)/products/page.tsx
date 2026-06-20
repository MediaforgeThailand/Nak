import Image from "next/image";
import { PackageSearch, Trash2 } from "lucide-react";
import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  deleteProductAction,
  updateProductAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { money } from "@/lib/format";
import { getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const [products, categories] = await Promise.all([
    getProductsWithInventory(true, "admin"),
    getProductCategories("admin"),
  ]);
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
        <h2 className="text-2xl font-semibold">จัดการสินค้า</h2>
        <p className="text-sm text-muted">เพิ่มสินค้า แก้ข้อมูลหลัก และอัปเดตรูปสำหรับลูกค้า</p>
      </div>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">หมวดหมู่สินค้า</h3>
            <p className="text-sm text-muted">เพิ่มหรือลบหมวดหมู่ได้ตลอด สินค้าที่เคยอยู่ในหมวดที่ลบจะกลับเป็นไม่ระบุหมวดหมู่</p>
          </div>
          <Badge>{categories.length} หมวดหมู่</Badge>
        </div>

        <form action={createCategoryAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field label="ชื่อหมวดหมู่"><Input name="name" required /></Field>
          <Field label="คำอธิบาย"><Input name="description" /></Field>
          <SubmitButton pendingLabel="กำลังเพิ่ม..." className="self-end">
            เพิ่มหมวดหมู่
          </SubmitButton>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.length === 0 ? (
            <span className="text-sm text-muted">ยังไม่มีหมวดหมู่</span>
          ) : (
            categories.map((category) => (
              <form key={category.id} action={deleteCategoryAction} className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-3 py-1.5">
                <input type="hidden" name="category_id" value={category.id} />
                <span className="text-sm font-medium">{category.name}</span>
                <button
                  type="submit"
                  aria-label={`ลบหมวดหมู่ ${category.name}`}
                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-full text-danger transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </form>
            ))
          )}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">เพิ่มสินค้าใหม่</h3>
        <form action={createProductAction} encType="multipart/form-data" className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="SKU"><Input name="sku" required /></Field>
          <Field label="ชื่อสินค้า"><Input name="name" required /></Field>
          <Field label="ราคา"><Input name="price" type="number" inputMode="decimal" min="0" step="0.01" required /></Field>
          <Field label="หน่วย"><Input name="unit" defaultValue="ชิ้น" required /></Field>
          <Field label="หมวดหมู่">
            <Select name="category_id" defaultValue="">
              <option value="">ไม่ระบุหมวดหมู่</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="เพิ่มหมวดหมู่ใหม่พร้อมสินค้า" hint="ถ้ากรอกช่องนี้ ระบบจะใช้หมวดใหม่นี้แทนตัวเลือกด้านบน">
            <Input name="new_category_name" placeholder="เช่น เครื่องดื่ม / อุปกรณ์" />
          </Field>
          <Field label="สต็อกตั้งต้น"><Input name="quantity_available" type="number" inputMode="numeric" min="0" defaultValue="0" /></Field>
          <Field label="เตือนเมื่อเหลือ"><Input name="low_stock_threshold" type="number" inputMode="numeric" min="0" defaultValue="5" /></Field>
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
          <div className="sm:col-span-2">
            <Field label="รายละเอียด"><Textarea name="description" /></Field>
          </div>
          <SubmitButton pendingLabel="กำลังเพิ่มสินค้า..." className="sm:col-span-2">
            เพิ่มสินค้า
          </SubmitButton>
        </form>
      </Card>

      <div className="grid gap-3">
        {products.map((product) => {
          const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
          const imageUrl = product.image_path ? productImageUrls.get(product.image_path) : null;
          return (
            <Card key={product.id}>
              <form action={updateProductAction} encType="multipart/form-data" className="grid gap-3 lg:grid-cols-[160px_1fr_1fr_120px_100px_140px]">
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
                <Field label="ราคา"><Input name="price" type="number" inputMode="decimal" step="0.01" defaultValue={product.price} /></Field>
                <Field label="หน่วย"><Input name="unit" defaultValue={product.unit} /></Field>
                <Field label="หมวดหมู่">
                  <Select name="category_id" defaultValue={product.category_id ?? ""}>
                    <option value="">ไม่ระบุ</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </Select>
                </Field>
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
                    <Badge tone="accent">{product.category?.name ?? "ไม่ระบุหมวดหมู่"}</Badge>
                    <span>Stock {inv?.quantity_available ?? 0}</span>
                    <span>{money(product.price)}</span>
                  </div>
                  <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
                    บันทึก
                  </SubmitButton>
                  <SubmitButton
                    variant="danger"
                    formAction={deleteProductAction}
                    pendingLabel="กำลังลบ..."
                  >
                    ลบออกจากหน้าลูกค้า
                  </SubmitButton>
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
