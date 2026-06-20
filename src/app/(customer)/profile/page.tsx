import { saveAddressAction, updateProfileAction } from "@/app/actions/customer";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireCustomer } from "@/lib/auth";
import { getCustomerAddresses } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await requireCustomer();
  const addresses = await getCustomerAddresses();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="text-xl font-semibold">โปรไฟล์</h2>
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
        <h2 className="text-xl font-semibold">ที่อยู่จัดส่ง</h2>
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
          <Field label="ตำบล/อำเภอ">
            <Input name="district" />
          </Field>
          <Field label="จังหวัด">
            <Input name="province" />
          </Field>
          <Field label="รหัสไปรษณีย์">
            <Input name="postal_code" inputMode="numeric" autoComplete="postal-code" />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input name="is_default" type="checkbox" />
            ตั้งเป็นที่อยู่หลัก
          </label>
          <SubmitButton pendingLabel="กำลังบันทึกที่อยู่...">
            เพิ่มที่อยู่
          </SubmitButton>
        </form>

        <div className="mt-5 grid gap-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-md border border-border p-3 text-sm">
              <p className="font-semibold">{address.label}</p>
              <p>{address.recipient_name}</p>
              <p className="text-muted">{address.address_line1}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
