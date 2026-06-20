import {
  adjustCustomerDebtAction,
  approveUserAction,
  suspendUserAction,
  updateCustomerDiscountAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { profile: currentProfile } = await requireAdmin();
  const profiles = await getProfiles();

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">จัดการลูกค้า</h2>
        <p className="mt-1 text-sm text-muted">
          Owner สามารถตั้งส่วนลดต่อชิ้นและปรับยอดหนี้ manual ได้จากหน้านี้
        </p>
      </div>

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}

      <div className="grid gap-3">
        {profiles.map((profile) => {
          const isCurrentUser = profile.id === currentProfile.id;
          const canOwnerEditCustomer = currentProfile.is_owner && profile.role === "customer";

          return (
            <Card key={profile.id}>
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">
                      {profile.company_name ?? profile.full_name ?? profile.email}
                    </h3>
                    <Badge
                      tone={
                        profile.status === "approved"
                          ? "success"
                          : profile.status === "suspended"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {profile.status}
                    </Badge>
                    <Badge>{profile.role}</Badge>
                    {profile.is_owner ? <Badge tone="accent">owner</Badge> : null}
                    {isCurrentUser ? <Badge tone="accent">กำลังใช้งาน</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {profile.email} · {profile.phone ?? "-"}
                  </p>
                  <div className="mt-3 grid gap-1 text-sm">
                    <p className="font-semibold">ยอดหนี้ {money(profile.debt_balance)}</p>
                    <p className="text-muted">
                      ส่วนลดส่วนตัว {money(profile.per_item_discount)} / ชิ้น
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <form action={approveUserAction} className="grid gap-2">
                    <input type="hidden" name="user_id" value={profile.id} />
                    <Select name="role" defaultValue={profile.role} disabled={isCurrentUser}>
                      <option value="customer">customer</option>
                      <option value="factory_staff">factory_staff</option>
                      <option value="admin">admin</option>
                    </Select>
                    <SubmitButton
                      variant="secondary"
                      pendingLabel="กำลังบันทึก..."
                      disabled={isCurrentUser}
                    >
                      อนุมัติ/เปลี่ยนสิทธิ์
                    </SubmitButton>
                  </form>
                  <form action={suspendUserAction}>
                    <input type="hidden" name="user_id" value={profile.id} />
                    <SubmitButton
                      variant="danger"
                      pendingLabel="กำลังระงับ..."
                      className="w-full"
                      disabled={isCurrentUser}
                    >
                      ระงับ
                    </SubmitButton>
                  </form>
                </div>
              </div>

              {canOwnerEditCustomer ? (
                <div className="mt-4 grid gap-3 border-t border-white/60 pt-4 lg:grid-cols-2">
                  <form
                    action={updateCustomerDiscountAction}
                    className="grid content-start gap-3 rounded-2xl border border-white/60 bg-white/42 p-3"
                  >
                    <input type="hidden" name="user_id" value={profile.id} />
                    <Field
                      label="ส่วนลดต่อชิ้น"
                      hint="เช่น 5 หรือ 10 บาท ระบบจะหักตามจำนวนสินค้าที่ลูกค้าสั่ง"
                    >
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

                  <form
                    action={adjustCustomerDebtAction}
                    className="grid content-start gap-3 rounded-2xl border border-white/60 bg-white/42 p-3"
                  >
                    <input type="hidden" name="user_id" value={profile.id} />
                    <Field
                      label="ปรับยอดหนี้ manual"
                      hint="ใส่บวกเพื่อเพิ่มหนี้ ใส่ลบเพื่อลดหนี้ เช่น 500 หรือ -500"
                    >
                      <Input
                        name="amount_delta"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        placeholder="500 หรือ -500"
                      />
                    </Field>
                    <Field label="หมายเหตุ">
                      <Textarea name="note" required />
                    </Field>
                    <SubmitButton variant="secondary" pendingLabel="กำลังปรับยอด...">
                      บันทึกปรับยอด
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
