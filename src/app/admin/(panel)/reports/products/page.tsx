import Link from "next/link";
import { Icon } from "@/components/nak/icon";
import { PageHead } from "@/components/nak/ui";
import { ChartCard, KpiGrid, KpiTile, RangeChips, ShareList, tileMoney } from "@/components/nak/report-ui";
import { requireAdmin } from "@/lib/auth";
import { getProductsWithInventory, getReportSalesOrders } from "@/lib/data/queries";
import { money } from "@/lib/format";
import { categoryBreakdown, resolveRange, soldProductIds, type ReportOrder } from "@/lib/report";
import { bkkStartOfDayISO, summarize, topProducts, type SalesOrder } from "@/lib/sales";

export const dynamic = "force-dynamic";

export default async function ProductsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;

  const { presets, active } = resolveRange(params.range, "30d");

  const [, ordersRaw, products] = await Promise.all([
    requireAdmin(),
    getReportSalesOrders(bkkStartOfDayISO(active.from)),
    getProductsWithInventory(false, "admin"),
  ]);
  const orders = ordersRaw as unknown as ReportOrder[];

  const rangeSum = summarize(orders as unknown as SalesOrder[], active.from, active.to);
  const categories = categoryBreakdown(orders, active.from, active.to);
  const categoryTotal = categories.reduce((sum, category) => sum + category.revenue, 0);
  const top = topProducts(orders as unknown as SalesOrder[], active.from, active.to, 10);
  const sold = soldProductIds(orders, active.from, active.to);

  type ProductRow = { id: string; name: string; sku: string };
  const unsold = (products as ProductRow[]).filter((product) => !sold.has(product.id));

  const categoryRows = categories.map((category) => ({
    key: category.name,
    name: category.name,
    value: category.revenue,
    valueLabel: `${categoryTotal > 0 ? Math.round((category.revenue / categoryTotal) * 100) : 0}%`,
    sub: `${money(category.revenue)} · ${category.pieces.toLocaleString("th-TH")} ชิ้น`,
  }));

  const productRows = top.map((product) => ({
    key: product.key,
    name: product.name,
    value: product.revenue,
    sub: `${product.quantity.toLocaleString("th-TH")} ${product.unit}`,
  }));

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead
        title="สินค้าและหมวดหมู่"
        sub="ยอดขายตามสินค้า · ออเดอร์ที่อนุมัติแล้ว"
        action={
          <Link href="/admin/reports" className="ad-link" style={{ fontSize: 12.5 }}>
            ← รายงาน
          </Link>
        }
      />

      <RangeChips basePath="/admin/reports/products" presets={presets} activeKey={active.key} />

      <KpiGrid>
        <KpiTile icon="wallet" label="ยอดขายช่วงนี้" value={tileMoney(rangeSum.total)} sub={active.label} tone="accent" />
        <KpiTile icon="bag" label="จำนวนที่ขาย" value={rangeSum.pieces.toLocaleString("th-TH")} sub="ชิ้น" tone="success" />
        <KpiTile icon="star" label="สินค้าที่ขายได้" value={sold.size.toLocaleString("th-TH")} sub={`จาก ${products.length.toLocaleString("th-TH")} รายการที่เปิดขาย`} tone="neutral" />
        <KpiTile icon="alert" label="ขายไม่ออก" value={unsold.length.toLocaleString("th-TH")} sub="ไม่มียอดขายในช่วงนี้" tone={unsold.length > 0 ? "warning" : "success"} />
      </KpiGrid>

      <ChartCard icon="dash" title="สัดส่วนยอดขายตามหมวด" meta={active.label}>
        <ShareList rows={categoryRows} />
      </ChartCard>

      <ChartCard icon="star" title="Top 10 สินค้าขายดี" meta="ตามยอดขาย">
        <ShareList rows={productRows} />
      </ChartCard>

      {unsold.length > 0 ? (
        <details className="ad-card" style={{ padding: "12px 16px" }}>
          <summary style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", listStyle: "none" }}>
            <Icon name="alert" size={15} stroke={2.2} style={{ color: "#a35a10" }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, flex: 1 }}>สินค้าขายไม่ออก ({unsold.length.toLocaleString("th-TH")})</span>
            <Icon name="chevD" size={15} stroke={2.4} style={{ color: "var(--muted)" }} />
          </summary>
          <div style={{ marginTop: 10, display: "grid" }}>
            {unsold.map((product, i) => (
              <div
                key={product.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: i < unsold.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {product.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0, fontFamily: "monospace" }}>{product.sku}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
