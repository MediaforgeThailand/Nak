import { Icon } from "@/components/nak/icon";
import { AdBadge, AdThumb, PageHead } from "@/components/nak/ui";
import { StockAdjustRow } from "@/components/nak/stock-adjust-row";
import { compactDate } from "@/lib/format";
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
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="จัดการสต็อก" sub="ปรับจำนวนแบบ manual พร้อมเหตุผล" />

      {params.error ? (
        <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
          {params.error}
        </div>
      ) : null}

      <div className="ad-card" style={{ padding: 6 }}>
        {products.map((product, i) => {
          const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
          const qty = inv?.quantity_available ?? 0;
          return (
            <div key={product.id} style={{ display: "grid", gap: 9, padding: 11, borderBottom: i < products.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <AdThumb name={product.name} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>{product.sku}</div>
                </div>
                <AdBadge tone={qty === 0 ? "danger" : qty < 40 ? "warning" : "neutral"}>คงเหลือ {qty}</AdBadge>
              </div>
              <StockAdjustRow productId={product.id} />
            </div>
          );
        })}
        {products.length === 0 ? <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>ยังไม่มีสินค้า</div> : null}
      </div>

      <div className="ad-card" style={{ padding: 16, display: "grid", gap: 4 }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>การเคลื่อนไหวล่าสุด</h3>
        {movements.map((m, i) => {
          const delta = Number(m.quantity_delta ?? 0);
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < movements.length - 1 ? "1px solid var(--line)" : "none" }}>
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.products?.name ?? m.products?.sku ?? "สินค้า"}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {(m.note ?? m.type) || "ปรับสต็อก"} · {compactDate(m.created_at)}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: delta > 0 ? "#1b7a4b" : "#b42318" }}>
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
