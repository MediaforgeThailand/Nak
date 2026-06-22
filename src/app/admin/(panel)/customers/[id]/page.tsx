import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";
import { adjustCustomerDebtAction, updateCustomerDiscountAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getAdminCustomerDetail } from "@/lib/data/queries";
import { accountStatusLabel, compactDate, dateTime, money, orderStatusLabel, paymentStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function displayName(profile: NonNullable<Awaited<ReturnType<typeof getAdminCustomerDetail>>["profile"]>) {
  return profile.company_name || profile.full_name || profile.email || "ผู้ใช้ LINE";
}

function transactionLabel(type: string) {
  const labels: Record<string, string> = {
    order_debt: "เพิ่มยอดจากออเดอร์",
    payment: "ชำระเงิน",
    manual_adjustment: "ปรับยอดด้วยมือ",
    order_reversal: "คืนยอดออเดอร์",
  };
  return labels[type] ?? type;
}

function InfoLine({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
  }[tone];

  return (
    <div className="rounded-lg border border-white/70 bg-white/64 p-3">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof UserRound;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h3 className="font-semibold">{title}</h3>
        </div>
        {action}
      </div>
      <div className="mt-3 grid gap-2">{children}</div>
    </Card>
  );
}

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, { profile: adminProfile }] = await Promise.all([
    params,
    searchParams,
    requireAdmin(),
  ]);
  const { profile, addresses, orders, payments, transactions } = await getAdminCustomerDetail(id);

  if (!profile) notFound();

  const canAdjustDebt = adminProfile.is_owner;
  const returnTo = `/admin/customers/${profile.id}`;
  const totalOrdered = orders.reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0);
  const paidTotal = payments
    .filter((payment) => payment.status === "approved")
    .reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <ButtonLink href="/admin/customers" variant="ghost" className="min-h-9 px-2.5">
          กลับ
        </ButtonLink>
        <Badge tone={profile.status === "approved" ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
          {accountStatusLabel(profile.status)}
        </Badge>
      </div>

      {query.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{query.error}</div>
      ) : null}

      <Card className="p-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/70 bg-white/76 text-accent">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-lg font-semibold">{displayName(profile)}</h2>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>ลูกค้า</Badge>
              <Badge tone="accent">ส่วนลด {money(profile.per_item_discount)} / ชิ้น</Badge>
            </div>
            <div className="mt-3 grid gap-1.5">
              <InfoLine icon={Mail}>{profile.email || "ยังไม่มีอีเมล"}</InfoLine>
              <InfoLine icon={Phone}>{profile.phone || "ยังไม่มีเบอร์โทร"}</InfoLine>
              <InfoLine icon={Building2}>{profile.company_name || "ยังไม่มีชื่อบริษัท / ร้านค้า"}</InfoLine>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="ยอดค้าง" value={money(profile.debt_balance)} tone="warning" />
        <MiniStat label="ยอดซื้อ" value={money(totalOrdered)} tone="success" />
        <MiniStat label="ชำระแล้ว" value={money(paidTotal)} />
        <MiniStat label="ออเดอร์" value={`${orders.length} รายการ`} />
      </div>

      <Section title="การจัดการบัญชี" icon={WalletCards}>
        <form action={updateCustomerDiscountAction} className="grid gap-2 rounded-lg border border-white/70 bg-white/58 p-3">
          <input type="hidden" name="user_id" value={profile.id} />
          <input type="hidden" name="return_to" value={returnTo} />
          <Field label="ส่วนลดต่อชิ้น">
            <Input
              name="per_item_discount"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={Number(profile.per_item_discount ?? 0)}
            />
          </Field>
          <SubmitButton variant="secondary" pendingLabel="กำลังบันทึก...">
            บันทึกส่วนลด
          </SubmitButton>
        </form>

        {canAdjustDebt ? (
          <form action={adjustCustomerDebtAction} className="grid gap-2 rounded-lg border border-white/70 bg-white/58 p-3">
            <input type="hidden" name="user_id" value={profile.id} />
            <input type="hidden" name="return_to" value={returnTo} />
            <Field label="ปรับยอดหนี้">
              <Input name="amount_delta" type="number" inputMode="decimal" step="0.01" placeholder="500 หรือ -500" />
            </Field>
            <Field label="หมายเหตุ">
              <Textarea name="note" required />
            </Field>
            <SubmitButton variant="secondary" pendingLabel="กำลังปรับยอด...">
              บันทึกยอด
            </SubmitButton>
          </form>
        ) : null}
      </Section>

      <Section title="ที่อยู่" icon={MapPin}>
        {addresses.slice(0, 3).map((address) => (
          <div key={address.id} className="rounded-lg border border-white/70 bg-white/58 p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{address.label}</p>
              {address.is_default ? <Badge tone="accent">หลัก</Badge> : null}
            </div>
            <p className="mt-1 text-xs text-muted">{address.recipient_name} · {address.phone || "-"}</p>
            <p className="mt-1 text-xs text-muted">
              {[address.address_line1, address.address_line2, address.district, address.province, address.postal_code]
                .filter(Boolean)
                .join(" ")}
            </p>
          </div>
        ))}
        {addresses.length === 0 ? <p className="text-sm text-muted">ยังไม่มีที่อยู่</p> : null}
      </Section>

      <Section title="ออเดอร์ล่าสุด" icon={ClipboardList}>
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders?stage=pending`}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/58 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{order.order_number}</p>
              <p className="text-xs text-muted">{compactDate(order.created_at)} · {orderStatusLabel(order.status)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-semibold">{money(order.subtotal)}</span>
              <ChevronRight className="h-4 w-4 text-muted" />
            </div>
          </Link>
        ))}
        {orders.length === 0 ? <p className="text-sm text-muted">ยังไม่มีออเดอร์</p> : null}
      </Section>

      <Section title="ชำระเงินล่าสุด" icon={CreditCard}>
        {payments.map((payment) => (
          <div key={payment.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/58 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{payment.payment_number}</p>
              <p className="text-xs text-muted">{compactDate(payment.created_at)} · {paymentStatusLabel(payment.status)}</p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-success">{money(payment.amount)}</span>
          </div>
        ))}
        {payments.length === 0 ? <p className="text-sm text-muted">ยังไม่มีการชำระเงิน</p> : null}
      </Section>

      <Section title="ธุรกรรมล่าสุด" icon={ReceiptText}>
        {transactions.map((transaction) => (
          <div key={transaction.id} className="rounded-lg border border-white/70 bg-white/58 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{transactionLabel(transaction.type)}</p>
                <p className="text-xs text-muted">{dateTime(transaction.created_at)}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold">{money(transaction.amount)}</span>
            </div>
            <p className="mt-1 text-xs text-muted">ยอดหลังรายการ {money(transaction.balance_after)}</p>
          </div>
        ))}
        {transactions.length === 0 ? <p className="text-sm text-muted">ยังไม่มีธุรกรรม</p> : null}
      </Section>
    </div>
  );
}
