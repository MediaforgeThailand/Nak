import { submitPaymentAction } from "@/app/actions/customer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";

export const dynamic = "force-dynamic";

export default async function NewPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="mx-auto grid max-w-2xl gap-4">
      <div>
        <h2 className="text-2xl font-semibold">แจ้งชำระเงิน</h2>
        <p className="text-sm text-muted">ยอดหนี้จะลดหลังแอดมินตรวจสลิปและอนุมัติเท่านั้น</p>
      </div>
      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}
      <Card>
        <form action={submitPaymentAction} className="grid gap-4">
          <Field label="ยอดโอน">
            <Input name="amount" type="number" min="1" step="0.01" required />
          </Field>
          <Field label="วันที่โอน">
            <Input name="transfer_date" type="date" />
          </Field>
          <Field label="สลิปโอนเงิน">
            <Input name="slip" type="file" accept="image/*,.pdf" required />
          </Field>
          <Field label="หมายเหตุ">
            <Textarea name="customer_note" />
          </Field>
          <Button type="submit">ส่งสลิปให้แอดมินตรวจ</Button>
        </form>
      </Card>
    </div>
  );
}
