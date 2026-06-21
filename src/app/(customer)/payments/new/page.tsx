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
        <p className="text-sm text-muted">ยอดหนี้จะลดหลังแอดมินตรวจสลิปและอนุมัติเท่านั้น</p>
      </div>
      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}
      <Card>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div className="grid aspect-square place-items-center rounded-md border border-border bg-surface-muted text-center">
            <div>
              <p className="text-lg font-semibold">QR ชำระเงิน</p>
              <p className="mt-1 text-xs text-muted">สแกนหรือโอนตามข้อมูลที่ทีมงานแจ้งไว้</p>
            </div>
          </div>
          <div className="text-sm leading-6">
            <p className="font-semibold">วิธีชำระเงิน</p>
            <p className="text-muted">สแกน QR โรงงานหรือโอนตามข้อมูลที่ทีมงานให้ไว้ แล้วถ่ายหรืออัปโหลดสลิปในฟอร์มด้านล่าง</p>
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
              hint="แนะนำให้ถ่ายรูปสลิปจากกล้องมือถือ"
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
