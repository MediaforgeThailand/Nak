import {
  createCategoryAction,
  createProductAction,
  deleteCategoryAction,
  updatePriceTiersAction,
  updateProductAction,
} from "@/app/actions/admin";
import { Icon } from "@/components/nak/icon";
import { DeleteProductConfirm } from "@/components/nak/delete-product-confirm";
import { AdBadge, AdThumb, NakField, PageHead } from "@/components/nak/ui";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { money } from "@/lib/format";
import { requireStaff } from "@/lib/auth";
import { getPriceTiers, getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; q?: string }>;
}) {
  const [params, { profile }] = await Promise.all([searchParams, requireStaff()]);
  const canDelete = profile.role === "admin";
  const query = (params.q ?? "").trim();
  const normalizedQuery = query.toLowerCase();
  const [products, categories, priceTiers] = await Promise.all([
    getProductsWithInventory(true, "admin"),
    getProductCategories("admin"),
    getPriceTiers("admin"),
  ]);
  const priceTiersText = priceTiers
    .map((tier) => `${tier.min_quantity}=${Number(tier.discount_amount)}`)
    .join("\n");
  const filtered = normalizedQuery
    ? products.filter((product) =>
        [product.name, product.sku, product.category?.name, product.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : products;
  const imageUrls = await signedUrls(
    "product-images",
    filtered.map((p) => p.image_path).filter((path): path is string => Boolean(path)),
    "admin",
  );

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="จัดการสินค้า" sub={`${products.length} รายการ`} />

      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}
      {params.notice ? (
        <div style={{ background: "#e7f4ec", border: "1px solid #bfe3cd", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#1b7a4b", fontSize: 12.5 }}>
          {params.notice}
        </div>
      ) : null}

      {/* categories */}
      <details className="ad-card" style={{ padding: 16 }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", listStyle: "none" }}>
          <Icon name="filter" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>หมวดหมู่สินค้า ({categories.length})</h3>
          <Icon name="chevD" size={16} stroke={2.4} style={{ color: "var(--muted)" }} />
        </summary>
        <form action={createCategoryAction} style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end" }}>
          <NakField label="ชื่อหมวดหมู่">
            <input className="ad-input" name="name" required />
          </NakField>
          <NakField label="คำอธิบาย">
            <input className="ad-input" name="description" />
          </NakField>
          <SubmitButton pendingLabel="..." variant="secondary">
            เพิ่ม
          </SubmitButton>
        </form>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {categories.length === 0 ? (
            <span style={{ fontSize: 13, color: "var(--muted)" }}>ยังไม่มีหมวดหมู่</span>
          ) : (
            categories.map((category) => (
              <form
                key={category.id}
                action={deleteCategoryAction}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 999,
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  padding: "5px 6px 5px 12px",
                }}
              >
                <input type="hidden" name="category_id" value={category.id} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{category.name}</span>
                <button type="submit" aria-label={`ลบ ${category.name}`} style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 999, border: "none", background: "transparent", color: "#b42318", cursor: "pointer" }}>
                  <Icon name="x" size={13} stroke={2.4} />
                </button>
              </form>
            ))
          )}
        </div>
      </details>

      {/* global-ladder */}
      <details className="ad-card" style={{ padding: 16 }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", listStyle: "none" }}>
          <Icon name="trending" size={16} stroke={2.2} style={{ color: "var(--p)" }} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>ส่วนลดขั้นบันได (ทุกสินค้า)</h3>
          <Icon name="chevD" size={16} stroke={2.4} style={{ color: "var(--muted)" }} />
        </summary>
        <form action={updatePriceTiersAction} style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <NakField
            label="จำนวนรวมทั้งออเดอร์=ส่วนลดบาทต่อชิ้น (ต่อบรรทัด)"
            hint="ลดจากราคากลางของทุกสินค้า เช่น 5=10 คือรวม 5 ชิ้นขึ้นไป ลดชิ้นละ 10 บาท — ปรับราคาสินค้าภายหลังได้โดยส่วนลดไม่เปลี่ยน"
          >
            <textarea
              className="ad-input"
              name="price_tiers"
              rows={6}
              defaultValue={priceTiersText}
              placeholder={"1=0\n5=10\n10=20"}
              style={{ resize: "vertical" }}
            />
          </NakField>
          <SubmitButton pendingLabel="กำลังบันทึก..." className="w-full">
            บันทึกส่วนลดขั้นบันได
          </SubmitButton>
        </form>
      </details>

      {/* add product */}
      <details className="ad-card" style={{ padding: 16 }}>
        <summary style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", listStyle: "none" }}>
          <span className="ad-iconbtn" style={{ width: 30, height: 30, background: "var(--p)", color: "#fff", borderColor: "var(--p)" }}>
            <Icon name="plus" size={17} stroke={2.6} />
          </span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>เพิ่มสินค้าใหม่</h3>
          <Icon name="chevD" size={16} stroke={2.4} style={{ color: "var(--muted)" }} />
        </summary>
        <form action={createProductAction} style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <NakField label="SKU">
            <input className="ad-input" name="sku" required />
          </NakField>
          <NakField label="ชื่อสินค้า">
            <input className="ad-input" name="name" required />
          </NakField>
          <NakField label="ราคา">
            <input className="ad-input" name="price" inputMode="decimal" min="0" step="0.01" type="number" required />
          </NakField>
          <NakField label="หน่วย">
            <input className="ad-input" name="unit" defaultValue="ลัง" required />
          </NakField>
          <NakField label="หมวดหมู่">
            <Select name="category_id" defaultValue="">
              <option value="">ไม่ระบุหมวดหมู่</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </NakField>
          <NakField label="เพิ่มหมวดหมู่ใหม่">
            <input className="ad-input" name="new_category_name" placeholder="เช่น เครื่องดื่ม" />
          </NakField>
          <NakField label="สต็อกตั้งต้น">
            <input className="ad-input" name="quantity_available" type="number" inputMode="numeric" min="0" defaultValue="0" />
          </NakField>
          <NakField label="เตือนเมื่อเหลือ">
            <input className="ad-input" name="low_stock_threshold" type="number" inputMode="numeric" min="0" defaultValue="5" />
          </NakField>
          <div style={{ gridColumn: "1 / -1" }}>
            <NakField label="รูปสินค้า">
              <FileUploadPreview name="image" accept="image/*" capture="environment" />
            </NakField>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <NakField label="รายละเอียด">
              <textarea className="ad-input" name="description" rows={2} style={{ resize: "none" }} />
            </NakField>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <SubmitButton pendingLabel="กำลังเพิ่ม..." className="w-full">
              เพิ่มสินค้า
            </SubmitButton>
          </div>
        </form>
      </details>

      {/* search */}
      <form action="/admin/products" method="get" className="ad-search">
        <Icon name="search" size={18} stroke={2.2} style={{ color: "var(--muted)" }} />
        <input name="q" defaultValue={query} placeholder="ค้นหาชื่อสินค้า / SKU" />
        <button type="submit" style={{ border: "none", background: "transparent", color: "var(--p)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ค้นหา
        </button>
      </form>

      {/* list */}
      <div className="ad-card" style={{ padding: 6 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>ไม่พบสินค้า</div>
        ) : null}
        {filtered.map((product, i) => {
          const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
          const qty = inv?.quantity_available ?? 0;
          const imageUrl = product.image_path ? imageUrls.get(product.image_path) : null;
          return (
            <details key={product.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--line)" : "none" }}>
              <summary style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, cursor: "pointer", listStyle: "none" }}>
                <AdThumb name={product.name} imageUrl={imageUrl} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
                    {product.sku} · {product.category?.name ?? "ไม่ระบุ"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{money(product.price)}</span>
                    <AdBadge tone={qty === 0 ? "danger" : qty < 40 ? "warning" : "neutral"}>{qty === 0 ? "หมด" : `เหลือ ${qty}`}</AdBadge>
                    <AdBadge tone={product.is_active ? "success" : "neutral"}>{product.is_active ? "เปิดขาย" : "ปิดขาย"}</AdBadge>
                  </div>
                </div>
                <span className="ad-iconbtn" style={{ width: 34, height: 34 }}>
                  <Icon name="edit" size={15} stroke={2.2} />
                </span>
              </summary>

              <form action={updateProductAction} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "4px 10px 14px" }}>
                <input type="hidden" name="id" value={product.id} />
                <NakField label="ชื่อ">
                  <input className="ad-input" name="name" defaultValue={product.name} />
                </NakField>
                <NakField label="SKU">
                  <input className="ad-input" name="sku" defaultValue={product.sku} />
                </NakField>
                <NakField label="ราคา">
                  <input className="ad-input" name="price" type="number" inputMode="decimal" step="0.01" defaultValue={product.price} />
                </NakField>
                <NakField label="หน่วย">
                  <input className="ad-input" name="unit" defaultValue={product.unit} />
                </NakField>
                <NakField label="หมวดหมู่">
                  <Select name="category_id" defaultValue={product.category_id ?? ""}>
                    <option value="">ไม่ระบุ</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </NakField>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, alignSelf: "end", paddingBottom: 10 }}>
                  <input name="is_active" type="checkbox" defaultChecked={product.is_active} /> เปิดขาย
                </label>
                <div style={{ gridColumn: "1 / -1" }}>
                  <NakField label="รายละเอียด">
                    <textarea className="ad-input" name="description" defaultValue={product.description ?? ""} rows={2} style={{ resize: "none" }} />
                  </NakField>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <NakField label="เปลี่ยนรูป (เว้นว่างถ้าไม่เปลี่ยน)">
                    <FileUploadPreview name="image" accept="image/*" capture="environment" />
                  </NakField>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <SubmitButton variant="secondary" pendingLabel="..." className="w-full">
                    บันทึก
                  </SubmitButton>
                </div>
              </form>
              {canDelete ? <DeleteProductConfirm productId={product.id} productName={product.name} /> : null}
            </details>
          );
        })}
      </div>
    </div>
  );
}
