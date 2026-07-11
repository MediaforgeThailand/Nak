import Link from "next/link";
import { PageHead } from "@/components/nak/ui";
import { ChartCard, KpiGrid, KpiTile, MiniBarChart, ReportHero, ShareList, tileMoney } from "@/components/nak/report-ui";
import { requireAdmin } from "@/lib/auth";
import { getApprovedPaymentsSince, getDebtors, getLastApprovedPayments, getPendingSlipCount } from "@/lib/data/queries";
import { compactDate, money } from "@/lib/format";
import { addDays, bkkDateKey, bkkStartOfDayISO, dayKeysBetween } from "@/lib/sales";

export const dynamic = "force-dynamic";

export default async function ReceivablesReportPage() {
  await requireAdmin();

  const today = bkkDateKey();
  const monthStart = `${today.slice(0, 8)}01`;
  const chartStart = addDays(today, -13);
  const since = [monthStart, chartStart].sort()[0];

  const [debtors, payments, pendingSlips] = await Promise.all([
    getDebtors(),
    getApprovedPaymentsSince(bkkStartOfDayISO(since)),
    getPendingSlipCount(),
  ]);
  // Only the 10 displayed debtors — keeps the payment-history scan bounded.
  const lastPayments = await getLastApprovedPayments(debtors.slice(0, 10).map((debtor) => debtor.id));

  const debtTotal = debtors.reduce((sum, debtor) => sum + Number(debtor.debt_balance ?? 0), 0);

  // Approved payments bucketed into Bangkok days for the 14-day chart.
  const byDay = new Map<string, number>();
  let monthReceived = 0;
  let monthCount = 0;
  for (const payment of payments) {
    const day = bkkDateKey(payment.reviewed_at);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(payment.amount ?? 0));
    if (day >= monthStart && day <= today) {
      monthReceived += Number(payment.amount ?? 0);
      monthCount += 1;
    }
  }
  const chartPoints = dayKeysBetween(chartStart, today).map((day) => ({
    key: day,
    label: String(Number(day.slice(8, 10))),
    value: byDay.get(day) ?? 0,
    title: `${compactDate(day)} · ${money(byDay.get(day) ?? 0)}`,
  }));

  const debtorRows = debtors.slice(0, 10).map((debtor) => {
    const last = lastPayments.get(debtor.id);
    return {
      key: debtor.id,
      name: debtor.company_name || debtor.full_name || debtor.email || "ไม่ระบุชื่อ",
      value: Number(debtor.debt_balance ?? 0),
      sub: last ? `ชำระล่าสุด ${compactDate(last.reviewed_at)}` : "ยังไม่เคยชำระ",
    };
  });

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <PageHead
        title="ลูกหนี้ค้างชำระ"
        sub="ยอดหนี้คงเหลือปัจจุบันและการรับชำระ"
        action={
          <Link href="/admin/reports" className="ad-link" style={{ fontSize: 12.5 }}>
            ← รายงาน
          </Link>
        }
      />

      <ReportHero icon="card" caption="ยอดค้างชำระรวมตอนนี้" value={money(debtTotal)}>
        <span style={{ fontSize: 12, opacity: 0.88 }}>{debtors.length.toLocaleString("th-TH")} ราย</span>
      </ReportHero>

      <KpiGrid>
        <KpiTile icon="users" label="ลูกหนี้" value={debtors.length.toLocaleString("th-TH")} sub="รายที่มียอดค้าง" tone={debtors.length > 0 ? "warning" : "success"} />
        <KpiTile icon="wallet" label="รับชำระเดือนนี้" value={tileMoney(monthReceived)} sub={`${monthCount.toLocaleString("th-TH")} รายการ`} tone="success" />
        <KpiTile icon="receipt" label="สลิปรอตรวจ" value={pendingSlips.toLocaleString("th-TH")} sub="รายการ" tone={pendingSlips > 0 ? "danger" : "neutral"} />
        <KpiTile icon="trending" label="เฉลี่ยหนี้/ราย" value={tileMoney(debtors.length > 0 ? debtTotal / debtors.length : 0)} sub="ยอดค้างเฉลี่ย" tone="neutral" />
      </KpiGrid>

      <ChartCard icon="card" title="ลูกหนี้สูงสุด" meta={debtors.length > 10 ? `10 จาก ${debtors.length} ราย` : "ทุกราย"}>
        <ShareList rows={debtorRows} barTone="warning" />
        {debtors.length > 0 ? (
          <Link href="/admin/customers" className="ad-link" style={{ fontSize: 12.5, justifySelf: "start" }}>
            ดูรายลูกค้าทั้งหมด →
          </Link>
        ) : null}
      </ChartCard>

      <ChartCard icon="wallet" title="รับชำระ 14 วันล่าสุด" meta="อนุมัติแล้ว">
        <MiniBarChart points={chartPoints} highlightKey={today} />
      </ChartCard>
    </div>
  );
}
