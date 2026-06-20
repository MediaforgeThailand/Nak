import { approvePaymentAction, rejectPaymentAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { dateTime, money, paymentStatusLabel } from "@/lib/format";
import { getPayments } from "@/lib/data/queries";
import { signedUrls } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const payments = await getPayments("admin");
  const slipUrls = await signedUrls("payment-slips", payments.map((payment) => payment.slip_path), "admin");

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">Payment verification</h2>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}
      <div className="grid gap-3">
        {payments.map((payment) => {
          const slipUrl = slipUrls.get(payment.slip_path) ?? undefined;
          return (
          <Card key={payment.id}>
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{payment.payment_number}</h3>
                  <Badge tone={payment.status === "approved" ? "success" : payment.status === "rejected" ? "danger" : "warning"}>
                    {paymentStatusLabel(payment.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {payment.customer?.company_name ?? payment.customer?.full_name ?? payment.customer?.email}
                  {" · "}
                  {dateTime(payment.created_at)}
                </p>
                <p className="mt-3 text-xl font-semibold">{money(payment.amount)}</p>
                {slipUrl ? (
                  <a
                    href={slipUrl}
                    target="_blank"
                    className="mt-2 inline-flex font-semibold text-accent"
                  >
                    เปิดสลิป
                  </a>
                ) : null}
              </div>

              {payment.status === "pending" ? (
                <div className="grid gap-2">
                  <form action={approvePaymentAction} className="grid gap-2">
                    <input type="hidden" name="payment_id" value={payment.id} />
                    <Input name="admin_note" placeholder="หมายเหตุ" />
                    <Button type="submit">อนุมัติสลิป</Button>
                  </form>
                  <form action={rejectPaymentAction} className="grid gap-2">
                    <input type="hidden" name="payment_id" value={payment.id} />
                    <Input name="admin_note" placeholder="เหตุผลที่ปฏิเสธ" />
                    <Button type="submit" variant="danger">ปฏิเสธ</Button>
                  </form>
                </div>
              ) : null}
            </div>
          </Card>
        );
        })}
      </div>
    </div>
  );
}
