import Link from "next/link";
import { PageHead, AdBadge } from "@/components/nak/ui";
import { ChartCard, EmptyNote, KpiGrid, KpiTile, MiniBarChart, ShareList, tileMoney } from "@/components/nak/report-ui";
import { requireAdmin } from "@/lib/auth";
import { getProductsWithInventory, getStockMovementsSince } from "@/lib/data/queries";
import { compactDate, money } from "@/lib/format";
import { addDays, bkkDateKey, bkkStartOfDayISO, dayKeysBetween } from "@/lib/sales";

export const dynamic = "force-dynamic";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  unit: string;
  price: number | null;
  is_active: boolean;
  category: { name: string } | { name: string }[] | null;
  inventory: { quantity_available: number; low_stock_threshold: number } | { quantity_available: number; low_stock_threshold: number }[] | null;
};

export default async function StockReportPage() {
  await requireAdmin();

  const today = bkkDateKey();
  const chartStart = addDays(today, -13);

  const [productsRaw, movements] = await Promise.all([
    getProductsWithInventory(true, "admin"),
    getStockMovementsSince(bkkStartOfDayISO(chartStart)),
  ]);

  const rows = (productsRaw as ProductRow[]).map((product) => {
    const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    const category = Array.isArray(product.category) ? product.category[0] : product.category;
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unit: product.unit,
      active: product.is_active,
      qty: Number(inv?.quantity_available ?? 0),
      threshold: Number(inv?.low_stock_threshold ?? 0),
      price: Number(product.price ?? 0),
      categoryName: category?.name || "ไม่ระบุหมวด",
    };
  });

  const active = rows.filter((row) => row.active);
  const stockValue = active.reduce((sum, row) => sum + row.qty * row.price, 0);
  const out = active.filter((row) => row.qty === 0);
  const low = active.filter((row) => row.qty > 0 && row.qty <= row.threshold);

  // Stock value by category (share bars).
  const byCategory = new Map<string, number>();
  for (const row of active) byCategory.set(row.categoryName, (byCategory.get(row.categoryName) ?? 0) + row.qty * row.price);
  const categoryRows = [...byCategory.entries()]
    .map(([name, value]) => ({ key: name, name, value, valueLabel: money(value), sub: `${stockValue > 0 ? Math.round((value / stockValue) * 100) : 0}% ของมูลค่ารวม` }))
    .sort((a, b) => b.value - a.value);

  // 14-day movements: positive deltas = stock in, negative = stock out.
  let inPieces = 0;
  let outPieces = 0;
  const outByDay = new Map<string, number>();
  for (const movement of movements) {
    const delta = Number(movement.quantity_delta ?? 0);
    const day = bkkDateKey(movement.created_at);
    if (delta > 0) inPieces += delta;
    else {
      outPieces += -delta;
      outByDay.set(day, (outByDay.get(day) ?? 0) + -delta);
    }
  }
  const chartPoints = dayKeysBetween(chartStart, today).map((day) => ({
    key: day,
    label: String(Number(day.slice(8, 10))),
    value: outByDay.get(day) ?? 0,
    title: `${compactDate(day)} · จ่ายออก ${(outByDay.get(day) ?? 0).toLocaleString("th-TH")} ชิ้น`,
  }));

  const attention = [...out, ...low];

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead
        title="รายงานสต็อก"
        sub="มูลค่าคงคลังและความเคลื่อนไหว"
        action={
          <Link href="/admin/reports" className="ad-link" style={{ fontSize: 12.5 }}>
            ← รายงาน
          </Link>
        }
      />

      <KpiGrid>
        <KpiTile icon="warehouse" label="มูลค่าสต็อก" value={tileMoney(stockValue)} sub="ราคาขาย × คงเหลือ" tone="accent" />
        <KpiTile icon="package" label="สินค้าเปิดขาย" value={active.length.toLocaleString("th-TH")} sub="รายการ" tone="neutral" />
        <KpiTile icon="alert" label="ใกล้หมด" value={low.length.toLocaleString("th-TH")} sub="ต่ำกว่าจุดเตือน" tone={low.length > 0 ? "warning" : "success"} />
        <KpiTile icon="x" label="หมดสต็อก" value={out.length.toLocaleString("th-TH")} sub="รายการ" tone={out.length > 0 ? "danger" : "success"} />
      </KpiGrid>

      <ChartCard icon="warehouse" title="มูลค่าสต็อกตามหมวด" meta={`${categoryRows.length} หมวด`}>
        <ShareList rows={categoryRows} />
      </ChartCard>

      <ChartCard icon="truck" title="จ่ายออก 14 วันล่าสุด" meta={`ออก ${outPieces.toLocaleString("th-TH")} · รับเข้า ${inPieces.toLocaleString("th-TH")} ชิ้น`}>
        <MiniBarChart points={chartPoints} highlightKey={today} valueLabel={(value) => `${value.toLocaleString("th-TH")}`} />
      </ChartCard>

      <ChartCard icon="alert" title="ต้องเติมสต็อก" meta={`${attention.length.toLocaleString("th-TH")} รายการ`}>
        {attention.length === 0 ? (
          <EmptyNote text="สต็อกทุกตัวอยู่เหนือจุดเตือน" />
        ) : (
          <div style={{ display: "grid" }}>
            {attention.map((row, i) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 0",
                  borderBottom: i < attention.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {row.name}
                </span>
                <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>เตือนที่ {row.threshold.toLocaleString("th-TH")}</span>
                <AdBadge tone={row.qty === 0 ? "danger" : "warning"}>{row.qty === 0 ? "หมด" : `เหลือ ${row.qty.toLocaleString("th-TH")}`}</AdBadge>
              </div>
            ))}
          </div>
        )}
        <Link href="/admin/stock" className="ad-link" style={{ fontSize: 12.5, justifySelf: "start" }}>
          ไปหน้าจัดการสต็อก →
        </Link>
      </ChartCard>
    </div>
  );
}
