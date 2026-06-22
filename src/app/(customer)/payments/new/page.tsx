import { submitPaymentAction } from "@/app/actions/customer";
import { Card } from "@/components/ui/card";
import { FileUploadPreview } from "@/components/ui/file-upload-preview";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";

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
      </div>
      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}
      <Card>
        <div className="grid gap-4">
          <div className="grid aspect-square max-w-[180px] place-items-center rounded-md border border-border bg-surface-muted text-center">
            <div>
              <p className="text-lg font-semibold">QR ชำระเงิน</p>
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <form action={submitPaymentAction} className="grid gap-4">
          <Field label="ยอดโอน">
            <Input name="amount" type="number" inputMode="decimal" min="1" step="0.01" required />
          </Field>
          <Field label="วันที่โอน">
            <Input name="transfer_date" type="date" />
          </Field>
          <Field label="สลิปโอนเงิน">
            <FileUploadPreview
              name="slip"
              accept="image/*,.pdf"
              capture="environment"
              required
            />
          </Field>
          <Field label="หมายเหตุ">
            <Textarea name="customer_note" />
          </Field>
          <SubmitButton pendingLabel="กำลังส่งสลิป...">
            ส่งสลิปให้แอดมินตรวจ
          </SubmitButton>
        </form>
      </Card>
    </div>
  );
}
