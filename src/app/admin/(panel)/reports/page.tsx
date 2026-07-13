import { PageHead } from "@/components/nak/ui";
import { DeltaChip, KpiGrid, KpiTile, ReportHero, ReportLinkRow, tileMoney } from "@/components/nak/report-ui";
import { SalesTrend } from "@/components/nak/sales-trend";
import { requireAdmin } from "@/lib/auth";
import { getDebtors, getPendingSlipCount, getProductsWithInventory, getSalesOrders } from "@/lib/data/queries";
import { money } from "@/lib/format";
import { addDays, bkkDateKey, bkkStartOfDayISO, dailySeries, dayKeysBetween, moneyCompact, summarize, type SalesOrder } from "@/lib/sales";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  await requireAdmin();

  const today = bkkDateKey();
  const monthStart = `${today.slice(0, 8)}01`;
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = `${prevMonthEnd.slice(0, 8)}01`;
  const weekStart = addDays(today, -6);
  const trendStart = addDays(today, -29);
  // Fetch far enough back to serve BOTH the month-over-month compare and the
  // 30-day trend (near a month boundary the 30-day window can start a day or two
  // before the previous month).
  const fetchFrom = trendStart < prevMonthStart ? trendStart : prevMonthStart;

  const [orders, debtors, products, pendingSlips] = await Promise.all([
    getSalesOrders(bkkStartOfDayISO(fetchFrom)) as Promise<unknown> as Promise<SalesOrder[]>,
    getDebtors(),
    getProductsWithInventory(true, "admin"),
    getPendingSlipCount(),
  ]);

  const todaySum = summarize(orders, today, today);
  const weekSum = summarize(orders, weekStart, today);
  const monthSum = summarize(orders, monthStart, today);

  // Compare month-to-date against the same number of elapsed days last month.
  const elapsed = dayKeysBetween(monthStart, today).length;
  const prevWindowEnd = addDays(prevMonthStart, elapsed - 1);
  const prevSum = summarize(orders, prevMonthStart, prevWindowEnd <= prevMonthEnd ? prevWindowEnd : prevMonthEnd);

  const trend = dailySeries(orders, trendStart, today);

  const debtTotal = debtors.reduce((sum, debtor) => sum + Number(debtor.debt_balance ?? 0), 0);

  type ProductRow = { price: number | null; is_active: boolean; inventory: { quantity_available: number; low_stock_threshold: number } | { quantity_available: number; low_stock_threshold: number }[] | null };
  const stockRows = (products as ProductRow[]).map((product) => {
    const inv = Array.isArray(product.inventory) ? product.inventory[0] : product.inventory;
    return {
      active: product.is_active,
      qty: Number(inv?.quantity_available ?? 0),
      threshold: Number(inv?.low_stock_threshold ?? 0),
      price: Number(product.price ?? 0),
    };
  });
  const activeStock = stockRows.filter((row) => row.active);
  const stockValue = activeStock.reduce((sum, row) => sum + row.qty * row.price, 0);
  const lowStockCount = activeStock.filter((row) => row.qty > 0 && row.qty <= row.threshold).length;
  const outCount = activeStock.filter((row) => row.qty === 0).length;

  const thaiMonth = new Intl.DateTimeFormat("th-TH", { month: "long", timeZone: "Asia/Bangkok" }).format(new Date(`${today}T12:00:00+07:00`));

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead title="รายงาน" sub="ภาพรวมธุรกิจและรายงานเชิงลึก · เวลาไทย" />

      <ReportHero icon="wallet" caption={`ยอดขายเดือน${thaiMonth} (1 – วันนี้)`} value={money(monthSum.total)}>
        <DeltaChip current={monthSum.total} previous={prevSum.total} />
        <span style={{ fontSize: 12, opacity: 0.88 }}>
          {monthSum.orders.toLocaleString("th-TH")} ออเดอร์ · {monthSum.pieces.toLocaleString("th-TH")} ชิ้น
        </span>
      </ReportHero>

      <KpiGrid>
        <KpiTile icon="wallet" label="ขายวันนี้" value={tileMoney(todaySum.total)} sub={`${todaySum.orders.toLocaleString("th-TH")} ออเดอร์`} tone="accent" />
        <KpiTile icon="trending" label="7 วันล่าสุด" value={tileMoney(weekSum.total)} sub={`${weekSum.orders.toLocaleString("th-TH")} ออเดอร์`} tone="success" />
        <KpiTile icon="alert" label="ลูกหนี้คงค้าง" value={tileMoney(debtTotal)} sub={`${debtors.length.toLocaleString("th-TH")} ราย`} tone={debtTotal > 0 ? "warning" : "neutral"} />
        <KpiTile icon="warehouse" label="มูลค่าสต็อก" value={tileMoney(stockValue)} sub={`ใกล้หมด ${lowStockCount} · หมด ${outCount}`} tone="neutral" />
      </KpiGrid>

      <SalesTrend points={trend} />

      <div className="ad-card" style={{ padding: "2px 2px" }}>
        <ReportLinkRow
          href="/admin/reports/sales"
          icon="trending"
          title="ยอดขาย"
          sub={`เดือนนี้ ${moneyCompact(monthSum.total)} · กราฟรายวัน + Top สินค้า`}
          tone="accent"
        />
        <ReportLinkRow
          href="/admin/reports/receivables"
          icon="card"
          title="ลูกหนี้ค้างชำระ"
          sub={`ค้างรวม ${moneyCompact(debtTotal)} · ${debtors.length.toLocaleString("th-TH")} ราย · สลิปรอตรวจ ${pendingSlips}`}
          tone={debtTotal > 0 ? "warning" : "success"}
        />
        <ReportLinkRow
          href="/admin/reports/products"
          icon="star"
          title="สินค้าและหมวดหมู่"
          sub="สินค้าขายดี · สัดส่วนหมวดหมู่ · สินค้าขายไม่ออก"
          tone="accent"
        />
        <ReportLinkRow
          href="/admin/reports/customers"
          icon="users"
          title="ลูกค้า"
          sub="ลูกค้าซื้อสูงสุด · ลูกค้าใหม่ · ยอดเฉลี่ยต่อออเดอร์"
          tone="success"
        />
        <ReportLinkRow
          href="/admin/reports/stock"
          icon="warehouse"
          title="สต็อกสินค้า"
          sub={`มูลค่า ${moneyCompact(stockValue)} · ใกล้หมด ${lowStockCount} รายการ`}
          tone={outCount > 0 ? "danger" : "neutral"}
          last
        />
      </div>
    </div>
  );
}
