import Link from "next/link";
import { notFound } from "next/navigation";
import { adjustCustomerDebtAction, updateCustomerDiscountAction } from "@/app/actions/admin";
import { AdBadge, Avatar, BackHead, InfoRow, MiniStat, NakField, SectionCard } from "@/components/nak/ui";
import { Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getAdminCustomerDetail } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, money, orderStatusLabel, paymentStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type CustomerDetail = Awaited<ReturnType<typeof getAdminCustomerDetail>>;

function displayName(profile: NonNullable<CustomerDetail["profile"]>) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

const txLabels: Record<string, string> = {
  order_debt: "เพิ่มยอดจากออเดอร์",
  payment: "ชำระเงิน",
  manual_adjustment: "ปรับยอดด้วยมือ",
  order_reversal: "คืนยอดออเดอร์",
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, { profile: adminProfile }] = await Promise.all([params, searchParams, requireAdmin()]);
  const { profile, addresses, orders, payments, transactions } = await getAdminCustomerDetail(id);
  if (!profile) notFound();

  const canAdjustDebt = adminProfile.is_owner;
  const returnTo = `/admin/customers/${profile.id}`;
  const totalOrdered = orders.reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0);
  const defaultAddress = addresses.find((a) => a.is_default) ?? addresses[0];

  return (
    <div style={{ display: "grid", gap: 13 }}>
      <BackHead
        title="รายละเอียดลูกค้า"
        backHref="/admin/customers"
        right={
          <AdBadge tone={profile.status === "approved" ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
            {accountStatusLabel(profile.status)}
          </AdBadge>
        }
      />

        {query.error ? (
          <div style={{ background: "#fbe6e3", border: "1px solid #f3c8c2", padding: "11px 12px", borderRadius: "var(--r-sm)", color: "#b42318", fontSize: 12.5 }}>
            {query.error}
          </div>
        ) : null}

        <div className="ad-card" style={{ padding: 16, display: "grid", gap: 15 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={displayName(profile)} size={48} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{displayName(profile)}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>
                {profile.full_name ?? "—"} · {profile.phone ?? "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <MiniStat label="ยอดค้าง" value={money(profile.debt_balance)} tone="warn" />
            <MiniStat label="ซื้อทั้งหมด" value={money(totalOrdered)} />
            <MiniStat label="ออเดอร์" value={String(orders.length)} />
            <MiniStat label="ส่วนลด/ชิ้น" value={Number(profile.per_item_discount ?? 0) > 0 ? money(profile.per_item_discount) : "—"} tone="ok" />
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            <InfoRow icon="mail" label="อีเมล" value={profile.email || "—"} />
            <InfoRow icon="building" label="บริษัท / ร้านค้า" value={profile.company_name || "—"} last />
          </div>
        </div>

        <SectionCard title="ปรับส่วนลดต่อชิ้น" icon="percent">
          <form action={updateCustomerDiscountAction} style={{ display: "grid", gap: 10, marginTop: 4 }}>
            <input type="hidden" name="user_id" value={profile.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <NakField label="ส่วนลดต่อชิ้น (บาท)">
              <Input name="per_item_discount" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={Number(profile.per_item_discount ?? 0)} />
            </NakField>
            <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
              บันทึกส่วนลด
            </SubmitButton>
          </form>
        </SectionCard>

        {canAdjustDebt ? (
          <SectionCard title="ปรับยอดหนี้ (เจ้าของระบบ)" icon="wallet">
            <form action={adjustCustomerDebtAction} style={{ display: "grid", gap: 10, marginTop: 4 }}>
              <input type="hidden" name="user_id" value={profile.id} />
              <input type="hidden" name="return_to" value={returnTo} />
              <NakField label="จำนวน (+ เพิ่มหนี้ / - ลดหนี้)">
                <Input name="amount_delta" type="number" inputMode="decimal" step="0.01" placeholder="500 หรือ -500" />
              </NakField>
              <NakField label="หมายเหตุ">
                <Textarea name="note" required />
              </NakField>
              <SubmitButton variant="secondary" pendingLabel="กำลังปรับยอด...">
                บันทึกยอด
              </SubmitButton>
            </form>
          </SectionCard>
        ) : null}

        {defaultAddress ? (
          <SectionCard title="ที่อยู่จัดส่ง" icon="pin">
            <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--muted)" }}>
              <div style={{ color: "var(--ink)", fontWeight: 600 }}>
                {defaultAddress.recipient_name} · {defaultAddress.phone || "—"}
              </div>
              <div>
                {[defaultAddress.address_line1, defaultAddress.district, defaultAddress.province, defaultAddress.postal_code]
                  .filter(Boolean)
                  .join(" ")}
              </div>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title="ออเดอร์ล่าสุด" icon="clipboard">
          {orders.map((order, i) => (
            <div
              key={order.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: i < orders.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{order.order_number}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {compactDate(order.created_at)} · {orderStatusLabel(order.status)}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{money(order.subtotal)}</span>
            </div>
          ))}
          {orders.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีออเดอร์</p> : null}
        </SectionCard>

        <SectionCard title="ชำระเงินล่าสุด" icon="card">
          {payments.map((payment, i) => (
            <div
              key={payment.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "10px 0",
                borderBottom: i < payments.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{payment.payment_number}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  {compactDate(payment.created_at)} · {paymentStatusLabel(payment.status)}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#1b7a4b" }}>{money(payment.amount)}</span>
            </div>
          ))}
          {payments.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีการชำระเงิน</p> : null}
        </SectionCard>

        <SectionCard title="ธุรกรรมล่าสุด" icon="receipt">
          {transactions.map((tx, i) => (
            <div key={tx.id} style={{ padding: "10px 0", borderBottom: i < transactions.length - 1 ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{txLabels[tx.type] ?? tx.type}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{compactDate(tx.created_at)}</div>
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 700 }}>{money(tx.amount)}</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>ยอดหลังรายการ {money(tx.balance_after)}</div>
            </div>
          ))}
          {transactions.length === 0 ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "6px 0" }}>ยังไม่มีธุรกรรม</p> : null}
        </SectionCard>
    </div>
  );
}
