import Link from "next/link";
import { BadgePercent, CreditCard, LogOut, MapPin, ReceiptText, UserRound } from "lucide-react";
import { signOutCustomerAction } from "@/app/actions/auth";
import { saveAddressAction, updateProfileAction } from "@/app/actions/customer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCustomer } from "@/lib/auth";
import {
  getCustomerAddresses,
  getCustomerOrders,
  getPayments,
  getTransactions,
} from "@/lib/data/queries";
import { accountStatusLabel, compactDate, money, paymentStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await requireCustomer();
  const [addresses, orders, transactions, payments] = await Promise.all([
    getCustomerAddresses(),
    getCustomerOrders(),
    getTransactions(),
    getPayments(),
  ]);
  const totalPurchased = orders
    .filter((order) => !["rejected", "cancelled"].includes(order.status))
    .reduce((sum, order) => sum + Number(order.subtotal ?? 0), 0);
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0];
  const discountPerItem = Math.max(Number(profile.per_item_discount ?? 0), 0);

  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/55 bg-white/70 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
              <UserRound className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-accent">โปรไฟล์และบัญชี</p>
              <h2 className="mt-1 break-words text-2xl font-semibold">
                {profile.company_name ?? profile.full_name ?? profile.email}
              </h2>
              <p className="mt-1 text-sm text-muted">{profile.email}</p>
            </div>
          </div>
          <Badge tone={profile.status === "approved" ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
            {accountStatusLabel(profile.status)}
          </Badge>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label="ยอดค้างชำระ" value={money(profile.debt_balance)} tone="warning" />
        <StatCard label="ซื้อไปทั้งหมด" value={money(totalPurchased)} tone="success" />
        <StatCard label="จำนวนออเดอร์" value={String(orders.length)} />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-emerald-200 bg-emerald-50 text-success shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-muted">Membership Discount</p>
              <h3 className="mt-1 text-lg font-semibold">
                {discountPerItem > 0 ? `ลด ${money(discountPerItem)} / ชิ้น` : "ยังไม่มีส่วนลดสมาชิก"}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">
                {discountPerItem > 0
                  ? "ส่วนลดนี้ตั้งจากฝั่งแอดมิน และจะถูกคำนวณอัตโนมัติเมื่อสั่งซื้อ"
                  : "ถ้าแอดมินตั้งส่วนลดให้ บัญชีนี้จะแสดงยอดลดต่อชิ้นตรงนี้"}
              </p>
            </div>
          </div>
          <Badge tone={discountPerItem > 0 ? "success" : "neutral"}>
            {discountPerItem > 0 ? "เปิดใช้งาน" : "ไม่มีส่วนลด"}
          </Badge>
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">ยอดค้างและการชำระเงิน</h3>
            <p className="text-sm text-muted">ดูยอดค้างปัจจุบันและแจ้งชำระเงินได้ทันที</p>
          </div>
          <ButtonLink href="/payments/new">
            <CreditCard className="h-4 w-4" />
            ชำระเงิน
          </ButtonLink>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="font-semibold">ข้อมูลติดต่อ</h3>
          <form action={updateProfileAction} className="mt-4 grid gap-4">
            <Field label="ชื่อผู้ติดต่อ">
              <Input name="full_name" defaultValue={profile.full_name ?? ""} />
            </Field>
            <Field label="บริษัท / ร้านค้า">
              <Input name="company_name" defaultValue={profile.company_name ?? ""} />
            </Field>
            <Field label="เบอร์โทร">
              <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} />
            </Field>
            <SubmitButton pendingLabel="กำลังบันทึกโปรไฟล์...">
              บันทึกโปรไฟล์
            </SubmitButton>
          </form>
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">ที่อยู่จัดส่ง</h3>
          </div>

          {defaultAddress ? (
            <div className="mt-3 rounded-2xl border border-white/60 bg-white/48 p-3 text-sm leading-6">
              <p className="font-semibold">{defaultAddress.label}</p>
              <p>{defaultAddress.recipient_name} · {defaultAddress.phone}</p>
              <p className="text-muted">{defaultAddress.address_line1}</p>
              <p className="text-muted">
                {[defaultAddress.district, defaultAddress.province, defaultAddress.postal_code]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">ยังไม่มีที่อยู่จัดส่ง</p>
          )}

          <form action={saveAddressAction} className="mt-4 grid gap-3">
            <Field label="ชื่อที่อยู่">
              <Input name="label" defaultValue="Main address" />
            </Field>
            <Field label="ผู้รับ">
              <Input name="recipient_name" required />
            </Field>
            <Field label="เบอร์โทร">
              <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" />
            </Field>
            <Field label="ที่อยู่">
              <Textarea name="address_line1" required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="ตำบล/อำเภอ">
                <Input name="district" />
              </Field>
              <Field label="จังหวัด">
                <Input name="province" />
              </Field>
              <Field label="รหัสไปรษณีย์">
                <Input name="postal_code" inputMode="numeric" autoComplete="postal-code" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="is_default" type="checkbox" />
              ตั้งเป็นที่อยู่หลัก
            </label>
            <SubmitButton pendingLabel="กำลังบันทึกที่อยู่...">
              เพิ่มที่อยู่
            </SubmitButton>
          </form>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">ธุรกรรมล่าสุด</h3>
          </div>
          <ButtonLink href="/transactions" variant="secondary">
            ดูธุรกรรมทั้งหมด
          </ButtonLink>
        </div>
        <div className="mt-4 grid gap-3">
          {transactions.slice(0, 5).map((tx) => (
            <Link
              key={tx.id}
              href="/transactions"
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border border-white/60 bg-white/48 p-3 transition-all duration-200 hover:bg-white/72 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <div className="min-w-0">
                <p className="font-medium">{tx.note ?? tx.type}</p>
                <p className="text-sm text-muted">{compactDate(tx.created_at)}</p>
              </div>
              <div className="text-right">
                <p className={Number(tx.amount) < 0 ? "font-semibold text-success" : "font-semibold text-warning"}>
                  {money(tx.amount)}
                </p>
                <p className="text-xs text-muted">คงเหลือ {money(tx.balance_after)}</p>
              </div>
            </Link>
          ))}
          {transactions.length === 0 ? (
            <p className="text-sm text-muted">ยังไม่มีรายการบัญชี</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold">ประวัติแจ้งชำระล่าสุด</h3>
        <div className="mt-4 grid gap-3">
          {payments.slice(0, 3).map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/48 p-3">
              <div>
                <p className="font-medium">{payment.payment_number}</p>
                <p className="text-sm text-muted">{compactDate(payment.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{money(payment.amount)}</p>
                <Badge tone={payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>
                  {paymentStatusLabel(payment.status)}
                </Badge>
              </div>
            </div>
          ))}
          {payments.length === 0 ? <p className="text-sm text-muted">ยังไม่มีประวัติแจ้งชำระ</p> : null}
        </div>
      </Card>

      <Card className="mb-2">
        <div className="grid gap-3">
          <div>
            <h3 className="font-semibold">ออกจากระบบ</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              ปุ่มนี้ถูกย้ายมาไว้ท้ายหน้าโปรไฟล์เพื่อป้องกันการกดออกจากระบบโดยไม่ตั้งใจ
            </p>
          </div>
          <form action={signOutCustomerAction}>
            <SubmitButton variant="secondary" pendingLabel="กำลังออกจากระบบ..." className="w-full">
              <LogOut className="h-4 w-4" />
              ออกจากระบบ
            </SubmitButton>
          </form>
        </div>
      </Card>
    </div>
  );
}
