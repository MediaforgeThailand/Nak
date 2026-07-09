import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { AdBadge, PageHead, ProductImage } from "@/components/nak/ui";
import { requireStaff } from "@/lib/auth";
import { getInventoryMovements, getProductCategories, getProductsWithInventory } from "@/lib/data/queries";
import { compactDate } from "@/lib/format";
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

const CARD_ACCENT: Record<Tone, { border: string; bg: string }> = {
  danger: { border: "#f0b9b2", bg: "#fdecea" },
  warning: { border: "#eed7ad", bg: "#fdf6ec" },
  success: { border: "var(--card-line)", bg: "" },
};

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const [params, { profile }] = await Promise.all([searchParams, requireStaff()]);
  const canEdit = profile.role === "admin";

  const [products, categories, movements] = await Promise.all([
    getProductsWithInventory(true, "admin"),
    getProductCategories("admin"),
    getInventoryMovements(),
  ]);

  const [productImages, movementPhotos] = await Promise.all([
    signedUrls("product-images", products.map((p) => p.image_path).filter((p): p is string => Boolean(p)), "admin"),
    signedUrls(
      "stock-photos",
      movements.map((m) => m.photo_path).filter((p): p is string => Boolean(p)),
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
          <Icon name="checkCircle" size={15} stroke={2.4} /> บันทึกรับเข้าสต็อกแล้ว
        </div>
      ) : null}
      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      {/* stock cards by category */}
      {groups.map((group) => (
        <div key={group.id} style={{ display: "grid", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800 }}>{group.name}</h3>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{group.items.length} รายการ</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 9 }}>
            {group.items.map((product) => {
              const inv = invOf(product);
              const qty = inv?.quantity_available ?? 0;
              const status = stockStatus(qty, inv?.low_stock_threshold ?? 0);
              const accent = CARD_ACCENT[status.tone];
              const imageUrl = product.image_path ? productImages.get(product.image_path) ?? null : null;
              const inner = (
                <>
                  <div style={{ position: "relative" }}>
                    <ProductImage seed={product.sku || product.id} imageUrl={imageUrl} alt={product.name} ratio="1 / 1" radius="12px" iconSize={30} />
                    {canEdit ? (
                      <span
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          width: 26,
                          height: 26,
                          borderRadius: 999,
                          background: "var(--p)",
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          boxShadow: "0 2px 8px -2px rgba(196,45,72,.5)",
                        }}
                      >
                        <Icon name="plus" size={15} stroke={2.8} />
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 32 }}>
                    {product.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <AdBadge tone={status.tone}>เหลือ {qty.toLocaleString("th-TH")}</AdBadge>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: status.tone === "danger" ? "#b42318" : status.tone === "warning" ? "#a35a10" : "#1b7a4b" }}>
                      {status.label}
                    </span>
                  </div>
                </>
              );
              const cardStyle = {
                display: "grid",
                gap: 8,
                padding: 9,
                borderRadius: "var(--r-sm)",
                border: `1px solid ${accent.border}`,
                background: accent.bg || "linear-gradient(180deg, rgba(255,255,255,.92), rgba(255,255,255,.74))",
                boxShadow: "var(--shadow)",
                minWidth: 0,
              } as const;
              return canEdit ? (
                <Link key={product.id} href={`/admin/stock/add?product=${product.id}`} style={cardStyle}>
                  {inner}
                </Link>
              ) : (
                <div key={product.id} style={cardStyle}>
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {products.length === 0 ? (
        <div className="ad-card" style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>ยังไม่มีสินค้า</div>
      ) : null}

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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoUrl} alt="รูปของเข้า" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  {(m.note ?? m.type) || "ปรับสต็อก"} · {compactDate(m.created_at)}
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
