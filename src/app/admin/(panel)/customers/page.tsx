import { BadgePercent, Mail, Phone, Search, UserRound, WalletCards } from "lucide-react";
import {
  adjustCustomerDebtAction,
  updateCustomerDiscountAction,
} from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireAdmin } from "@/lib/auth";
import { getProfiles } from "@/lib/data/queries";
import { accountStatusLabel, money } from "@/lib/format";

export const dynamic = "force-dynamic";

function includesSearch(profile: Awaited<ReturnType<typeof getProfiles>>[number], query: string) {
  if (!query) return true;
  const haystack = [
    profile.company_name,
    profile.full_name,
    profile.email,
    profile.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string }>;
}) {
  const params = await searchParams;
  const { profile: currentProfile } = await requireAdmin();
  const profiles = await getProfiles();
  const query = String(params.q ?? "").trim();
  const customers = profiles.filter((profile) => profile.role === "customer" && profile.status !== "pending");
  const filteredCustomers = customers.filter((profile) => includesSearch(profile, query));
  const canAdjustDebt = currentProfile.is_owner;

  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-semibold">จัดการลูกค้า</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          หน้านี้ใช้ดูบัญชีลูกค้า ตั้งส่วนลดรายคน และปรับยอดหนี้ด้วยมือ ไม่มีการเปลี่ยนสิทธิ์เป็นทีมงานจากหน้านี้
        </p>
      </div>

      {params.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">
          {params.error}
        </div>
      ) : null}

      <Card>
        <form action="/admin/customers" className="grid gap-3 sm:grid-cols-[1fr_auto]" method="get">
          <Field label="ค้นหาลูกค้า">
            <Input
              name="q"
              defaultValue={query}
              placeholder="ชื่อ บริษัท อีเมล หรือเบอร์โทร"
              autoComplete="off"
            />
          </Field>
          <Button type="submit" variant="secondary" className="self-end">
            <Search className="h-4 w-4" />
            ค้นหา
          </Button>
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-muted">ลูกค้าทั้งหมด</p>
          <p className="mt-2 text-2xl font-semibold">{customers.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-muted">ผลการค้นหา</p>
          <p className="mt-2 text-2xl font-semibold text-accent">{filteredCustomers.length}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-normal text-muted">สิทธิ์ปรับหนี้</p>
          <p className="mt-2 text-lg font-semibold">
            {canAdjustDebt ? "เจ้าของระบบ" : "ดูได้เท่านั้น"}
          </p>
        </Card>
      </div>

      <div className="grid gap-3">
        {filteredCustomers.map((profile) => (
          <Card key={profile.id}>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/78 text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">
                        {profile.company_name ?? profile.full_name ?? profile.email}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          tone={
                            profile.status === "approved"
                              ? "success"
                              : profile.status === "suspended"
                                ? "danger"
                                : "warning"
                          }
                        >
                          {accountStatusLabel(profile.status)}
                        </Badge>
                        <Badge>ลูกค้า</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <div className="flex min-w-0 items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-accent" />
                    <span className="break-words">{profile.email}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-accent" />
                    <span>{profile.phone ?? "ยังไม่มีเบอร์โทร"}</span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/70 bg-white/62 p-3">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <WalletCards className="h-4 w-4 text-warning" />
                      ยอดหนี้
                    </div>
                    <p className="mt-1 text-xl font-semibold text-warning">{money(profile.debt_balance)}</p>
                  </div>
                  <div className="rounded-lg border border-white/70 bg-white/62 p-3">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <BadgePercent className="h-4 w-4 text-success" />
                      ส่วนลดรายคน
                    </div>
                    <p className="mt-1 text-xl font-semibold text-success">
                      {money(profile.per_item_discount)} / ชิ้น
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid content-start gap-3">
                <form
                  action={updateCustomerDiscountAction}
                  className="grid gap-3 rounded-lg border border-white/70 bg-white/52 p-3"
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

                {canAdjustDebt ? (
                  <form
                    action={adjustCustomerDebtAction}
                    className="grid gap-3 rounded-lg border border-white/70 bg-white/52 p-3"
                  >
                    <input type="hidden" name="user_id" value={profile.id} />
                    <Field
                      label="ปรับยอดหนี้ด้วยมือ"
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
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-warning">
                    การปรับยอดหนี้ด้วยมือทำได้เฉพาะบัญชีเจ้าของระบบเท่านั้น
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredCustomers.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">
              ไม่พบลูกค้าที่ตรงกับคำค้นหา ลองค้นด้วยชื่อร้าน อีเมล หรือเบอร์โทรอีกครั้ง
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
