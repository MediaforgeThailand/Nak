import Link from "next/link";
import { ClipboardCheck, History, PlusCircle } from "lucide-react";
import {
  approvePaymentAction,
  recordManualPaymentAction,
  rejectPaymentAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { getPayments, getProfiles } from "@/lib/data/queries";
import { dateTime, money, paymentStatusLabel } from "@/lib/format";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

type PaymentStage = "pending" | "history" | "manual";

const stageTabs: {
  key: PaymentStage;
  label: string;
  Icon: typeof ClipboardCheck;
}[] = [
  { key: "pending", label: "รอตรวจสลิป", Icon: ClipboardCheck },
  { key: "history", label: "ประวัติ", Icon: History },
  { key: "manual", label: "บันทึกเอง", Icon: PlusCircle },
];

function normalizeStage(value: string | undefined): PaymentStage {
  return value === "history" || value === "manual" ? value : "pending";
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; stage?: string }>;
}) {
  const params = await searchParams;
  const activeStage = normalizeStage(params.stage);
  const [payments, profiles] = await Promise.all([
    getPayments("admin"),
    getProfiles(),
  ]);
  const approvedCustomers = profiles.filter(
    (profile) => profile.role === "customer" && profile.status === "approved",
  );
  const slipPaths = payments
    .map((payment) => payment.slip_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
  const slipUrls = await signedUrls("payment-slips", slipPaths, "admin");
  const pendingPayments = payments.filter((payment) => payment.status === "pending");
  const historyPayments = payments.filter((payment) => payment.status !== "pending");
  const visiblePayments = activeStage === "history" ? historyPayments : pendingPayments;
  const counts: Record<PaymentStage, number> = {
    pending: pendingPayments.length,
    history: historyPayments.length,
    manual: approvedCustomers.length,
  };

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">ตรวจสลิปชำระเงิน</h2>
        <p className="mt-1 text-sm text-muted">
          อนุมัติสลิปจากลูกค้า หรือบันทึกยอดชำระเองจากฝั่งทีมงาน
        </p>
      </div>

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}

      <Card className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {stageTabs.map(({ key, label, Icon }) => {
            const active = key === activeStage;
            return (
              <Link
                key={key}
                href={`/admin/payments?stage=${key}`}
                className={[
                  "motion-surface relative grid min-h-[82px] place-items-center gap-1 rounded-lg border px-2 py-3 text-center transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  active
                    ? "border-accent bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_12px_28px_rgba(15,118,110,0.22)]"
                    : "border-white/70 bg-white/72 text-foreground hover:bg-white/92",
                ].join(" ")}
              >
                <span className="relative">
                  <Icon className="h-7 w-7" />
                  {counts[key] > 0 ? (
                    <span className="absolute -right-3 -top-3 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">
                      {counts[key]}
                    </span>
                  ) : null}
                </span>
                <span className="text-[12px] font-semibold leading-snug">{label}</span>
              </Link>
            );
          })}
        </div>
      </Card>

      {activeStage === "manual" ? (
      <Card>
        <h3 className="font-semibold">บันทึกชำระเงินโดยทีมงาน</h3>
        <form action={recordManualPaymentAction} className="mt-4 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="ลูกค้า">
              <Select name="customer_id" required>
                <option value="">เลือกลูกค้า</option>
                {approvedCustomers.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.company_name ?? profile.full_name ?? profile.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="ยอดชำระ">
              <Input name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required />
            </Field>
            <Field label="วันที่โอน">
              <Input name="transfer_date" type="date" />
            </Field>
          </div>

          <Field label="แนบ slip (optional)">
            <FileUploadPreview
              name="slip"
              accept="image/*,application/pdf"
              hint="แนบรูปหรือ PDF ได้ ถ้าไม่มี slip สามารถเว้นว่างได้"
            />
          </Field>

          <Field label="หมายเหตุทีมงาน">
            <Textarea name="admin_note" />
          </Field>

          <SubmitButton pendingLabel="กำลังบันทึกยอดชำระ...">
            บันทึกชำระเงิน
          </SubmitButton>
        </form>
      </Card>
      ) : null}

      {activeStage !== "manual" ? (
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            {activeStage === "pending" ? "สลิปที่รอตรวจ" : "ประวัติการตรวจสลิป"}
          </h3>
          <Badge tone={visiblePayments.length > 0 ? "accent" : "neutral"}>
            {visiblePayments.length} รายการ
          </Badge>
        </div>

        {visiblePayments.length === 0 ? (
          <Card>
            <h3 className="font-semibold">
              {activeStage === "pending" ? "ไม่มีสลิปรอตรวจ" : "ยังไม่มีประวัติในหมวดนี้"}
            </h3>
          </Card>
        ) : null}

        {visiblePayments.map((payment) => {
          const slipUrl =
            typeof payment.slip_path === "string"
              ? slipUrls.get(payment.slip_path) ?? undefined
              : undefined;

          return (
            <Card key={payment.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{payment.payment_number}</h3>
                    <Badge
                      tone={
                        payment.status === "approved"
                          ? "success"
                          : payment.status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {paymentStatusLabel(payment.status)}
                    </Badge>
                    {payment.source === "admin_manual" ? <Badge tone="accent">บันทึกโดยทีมงาน</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {payment.customer?.company_name ?? payment.customer?.full_name ?? payment.customer?.email}
                    {" · "}
                    {dateTime(payment.created_at)}
                  </p>
                  <p className="mt-3 text-xl font-semibold">{money(payment.amount)}</p>
                  {payment.admin_note ? (
                    <p className="mt-2 text-sm text-muted">หมายเหตุ: {payment.admin_note}</p>
                  ) : null}
                  {slipUrl ? (
                    <a
                      href={slipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex font-semibold text-accent"
                    >
                      เปิดสลิป
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-muted">ไม่มีสลิปแนบ</p>
                  )}
                </div>

                {payment.status === "pending" ? (
                  <div className="grid gap-2">
                    <form action={approvePaymentAction} className="grid gap-2">
                      <input type="hidden" name="payment_id" value={payment.id} />
                      <Input name="admin_note" placeholder="หมายเหตุ" />
                      <SubmitButton pendingLabel="กำลังอนุมัติ...">
                        อนุมัติสลิป
                      </SubmitButton>
                    </form>
                    <form action={rejectPaymentAction} className="grid gap-2">
                      <input type="hidden" name="payment_id" value={payment.id} />
                      <Input name="admin_note" placeholder="เหตุผลที่ปฏิเสธ" />
                      <SubmitButton variant="danger" pendingLabel="กำลังปฏิเสธ...">
                        ปฏิเสธ
                      </SubmitButton>
                    </form>
                  </div>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}
