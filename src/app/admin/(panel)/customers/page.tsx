import { approveUserAction, suspendUserAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { money } from "@/lib/format";
import { getProfiles } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const profiles = await getProfiles();

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">Customer management</h2>
      {params.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-danger">{params.error}</div> : null}
      <div className="grid gap-3">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{profile.company_name ?? profile.full_name ?? profile.email}</h3>
                  <Badge tone={profile.status === "approved" ? "success" : profile.status === "suspended" ? "danger" : "warning"}>
                    {profile.status}
                  </Badge>
                  <Badge>{profile.role}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted">{profile.email} · {profile.phone}</p>
                <p className="mt-2 font-semibold">ยอดหนี้ {money(profile.debt_balance)}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <form action={approveUserAction} className="grid gap-2">
                  <input type="hidden" name="user_id" value={profile.id} />
                  <Select name="role" defaultValue={profile.role}>
                    <option value="customer">customer</option>
                    <option value="factory_staff">factory_staff</option>
                    <option value="admin">admin</option>
                  </Select>
                  <Button type="submit" variant="secondary">อนุมัติ/เปลี่ยนสิทธิ์</Button>
                </form>
                <form action={suspendUserAction}>
                  <input type="hidden" name="user_id" value={profile.id} />
                  <Button type="submit" variant="danger" className="w-full">ระงับ</Button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
