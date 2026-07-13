import Link from "next/link";
import { PageHead } from "@/components/nak/ui";
import { ChartCard, KpiGrid, KpiTile, RangeChips, ShareList, tileMoney } from "@/components/nak/report-ui";
import { requireAdmin } from "@/lib/auth";
import { getNewCustomerCount, getReportSalesOrders } from "@/lib/data/queries";
import { resolveRange, topCustomers, type ReportOrder } from "@/lib/report";
import { bkkStartOfDayISO, summarize, type SalesOrder } from "@/lib/sales";

export const dynamic = "force-dynamic";

export default async function CustomersReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;

  const { presets, active } = resolveRange(params.range, "30d");

  const [, ordersRaw, newCustomers] = await Promise.all([
    requireAdmin(),
    getReportSalesOrders(bkkStartOfDayISO(active.from)),
    getNewCustomerCount(bkkStartOfDayISO(active.from)),
  ]);
  const orders = ordersRaw as unknown as ReportOrder[];

  const rangeSum = summarize(orders as unknown as SalesOrder[], active.from, active.to);
  const buyers = topCustomers(orders, active.from, active.to, 10);
  const buyerCount = topCustomers(orders, active.from, active.to, Number.MAX_SAFE_INTEGER).length;
  const avgPerOrder = rangeSum.orders > 0 ? rangeSum.total / rangeSum.orders : 0;

  const buyerRows = buyers.map((buyer) => ({
    key: buyer.key,
    name: buyer.name,
    value: buyer.revenue,
    sub: `${buyer.orders.toLocaleString("th-TH")} ออเดอร์ · ${buyer.pieces.toLocaleString("th-TH")} ชิ้น`,
  }));

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead
        title="รายงานลูกค้า"
        sub="ลูกค้าที่ซื้อและยอดซื้อ · ออเดอร์ที่อนุมัติแล้ว"
        action={
          <Link href="/admin/reports" className="ad-link" style={{ fontSize: 12.5 }}>
            ← รายงาน
          </Link>
        }
      />

      <RangeChips basePath="/admin/reports/customers" presets={presets} activeKey={active.key} />

      <KpiGrid>
        <KpiTile icon="users" label="ลูกค้าที่ซื้อ" value={buyerCount.toLocaleString("th-TH")} sub={active.label} tone="accent" />
        <KpiTile icon="plus" label="ลูกค้าใหม่" value={newCustomers.toLocaleString("th-TH")} sub="สมัครในช่วงนี้" tone="success" />
        <KpiTile icon="wallet" label="ยอดขายรวม" value={tileMoney(rangeSum.total)} sub={`${rangeSum.orders.toLocaleString("th-TH")} ออเดอร์`} tone="neutral" />
        <KpiTile icon="bag" label="เฉลี่ยต่อออเดอร์" value={tileMoney(avgPerOrder)} sub="ช่วงที่เลือก" tone="neutral" />
      </KpiGrid>

      <ChartCard icon="users" title="ลูกค้าซื้อสูงสุด" meta={buyerCount > 10 ? `10 จาก ${buyerCount.toLocaleString("th-TH")} ราย` : active.label}>
        <ShareList rows={buyerRows} />
        {buyerCount > 0 ? (
          <Link href="/admin/customers" className="ad-link" style={{ fontSize: 12.5, justifySelf: "start" }}>
            ดูรายลูกค้าทั้งหมด →
          </Link>
        ) : null}
      </ChartCard>
    </div>
  );
}
