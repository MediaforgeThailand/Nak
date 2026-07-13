import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { PageHead } from "@/components/nak/ui";
import { StockBoard, type StockBoardGroup } from "@/components/nak/stock-board";
import { requireStaff } from "@/lib/auth";
import { getInventoryMovements, getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { compactDate } from "@/lib/format";
import { defaultProductImage } from "@/lib/product-images";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

type Tone = "success" | "warning" | "danger";

// Stock health from the per-product low-stock threshold (falls back to 5).
function stockStatus(qty: number, threshold: number): { tone: Tone; label: string } {
  const t = threshold > 0 ? threshold : 5;
  if (qty <= 0) return { tone: "danger", label: "หมด" };
  if (qty <= t) return { tone: "danger", label: "ใกล้หมด" };
  if (qty <= t * 2) return { tone: "warning", label: "เริ่มน้อย" };
  return { tone: "success", label: "ปกติ" };
}

// "Marbo9k แท้ - Grape" → "Grape" (tiles live under the category header already).
function flavourOf(name: string) {
  const ix = name.indexOf(" - ");
  return ix > -1 ? name.slice(ix + 3) : name;
}

// Thai label for a stock movement (shown when the row has no admin note) so the
// history never surfaces the raw English enum value.
const MOVEMENT_LABEL: Record<string, string> = {
  initial: "ยอดตั้งต้น",
  restock: "รับเข้าสต็อก",
  order_reserved: "ตัดจากออเดอร์",
  order_rejected_restore: "คืนจากออเดอร์ที่ยกเลิก",
  manual_adjustment: "ปรับด้วยมือ",
};
function movementLabel(type: string | null | undefined) {
  return (type && MOVEMENT_LABEL[type]) || "ปรับสต็อก";
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [params, { profile }] = await Promise.all([searchParams, requireStaff()]);
  const canEdit = profile.role === "admin";

  const [products, categories, movements] = await Promise.all([
    getProductsWithInventory(false, "admin"),
    getProductCategories("admin"),
    getInventoryMovements(),
  ]);

  const [movementPhotos, productImages] = await Promise.all([
    signedUrls(
      "stock-photos",
      movements.map((m) => m.photo_path).filter((p): p is string => Boolean(p)),
      "admin",
    ),
    signedUrls(
      "product-images",
      products.map((p) => p.image_path).filter((p): p is string => Boolean(p)),
      "admin",
    ),
  ]);

  const invOf = (p: (typeof products)[number]) => (Array.isArray(p.inventory) ? p.inventory[0] : p.inventory);

  // Group products by category (in category sort order), uncategorised last.
  const groups = categories
    .map((c) => ({ id: c.id, name: c.name, items: products.filter((p) => p.category_id === c.id) }))
    .filter((g) => g.items.length > 0);
  const known = new Set(categories.map((c) => c.id));
  const uncategorised = products.filter((p) => !p.category_id || !known.has(p.category_id));
  if (uncategorised.length > 0) groups.push({ id: "none", name: "อื่น ๆ", items: uncategorised });

  const lowCount = products.filter((p) => {
    const inv = invOf(p);
    return stockStatus(inv?.quantity_available ?? 0, inv?.low_stock_threshold ?? 0).tone !== "success";
  }).length;

  const boardGroups: StockBoardGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    items: g.items.map((p) => {
      const inv = invOf(p);
      const qty = inv?.quantity_available ?? 0;
      return {
        id: p.id,
        name: p.name,
        shortName: flavourOf(p.name),
        sku: p.sku ?? "",
        qty,
        tone: stockStatus(qty, inv?.low_stock_threshold ?? 0).tone,
        image: (p.image_path ? productImages.get(p.image_path) ?? null : null) ?? defaultProductImage(p.sku),
      };
    }),
  }));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <PageHead
        title="จัดการสต็อก"
        sub={lowCount > 0 ? `มี ${lowCount} รายการที่ใกล้หมด/หมด` : "สต็อกอยู่ในเกณฑ์ปกติ"}
        action={
          canEdit ? (
            <Link href="/admin/stock/add" className="ad-btn ad-btn-primary" style={{ width: "auto", padding: "10px 16px" }}>
              <Icon name="plus" size={16} stroke={2.6} /> เพิ่มสต็อก
            </Link>
          ) : null
        }
      />

      {params.ok ? (
        <div style={{ background: "#e7f4ec", border: "1px solid #bfe3cd", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#1b7a4b", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="checkCircle" size={15} stroke={2.4} /> {params.ok === "out" ? "ปรับลดสต็อกแล้ว" : "บันทึกรับเข้าสต็อกแล้ว"}
        </div>
      ) : null}
      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      {/* whiteboard-style stock overview */}
      {products.length > 0 ? (
        <StockBoard groups={boardGroups} canEdit={canEdit} />
      ) : (
        <div className="ad-card" style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>ยังไม่มีสินค้า</div>
      )}

      {/* history */}
      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 4 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>ประวัติรับเข้า / ปรับสต็อก</h3>
        {movements.map((m, i) => {
          const delta = Number(m.quantity_delta ?? 0);
          const photoUrl = m.photo_path ? movementPhotos.get(m.photo_path) ?? null : null;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < movements.length - 1 ? "1px solid var(--line)" : "none" }}>
              {photoUrl ? (
                <a href={photoUrl} target="_blank" rel="noopener noreferrer" style={{ position: "relative", width: 40, height: 40, borderRadius: 9, overflow: "hidden", flexShrink: 0, display: "block" }}>
                  <Image src={photoUrl} alt="รูปของเข้า" fill sizes="40px" style={{ objectFit: "cover" }} />
                </a>
              ) : (
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: delta > 0 ? "#e7f4ec" : "#fbe6e3",
                    color: delta > 0 ? "#1b7a4b" : "#b42318",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name={delta > 0 ? "plus" : "minus"} size={15} stroke={2.6} />
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.products?.name ?? m.products?.sku ?? "สินค้า"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {m.note || movementLabel(m.type)} · {compactDate(m.created_at)}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: delta > 0 ? "#1b7a4b" : "#b42318", flexShrink: 0 }}>
                {delta > 0 ? "+" : ""}
                {delta}
              </span>
            </div>
          );
        })}
        {movements.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0" }}>ยังไม่มีการเคลื่อนไหว</p> : null}
      </div>
    </div>
  );
}
