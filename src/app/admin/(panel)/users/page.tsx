import { Card } from "@/components/ui/card";
import { getProfiles } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

const permissions = [
  ["admin", "manage_products, manage_stock, manage_orders, verify_payments, manage_customers, manage_permissions, manage_settings"],
  ["factory_staff", "upload_order_photos, update_order_status"],
  ["customer", "place_orders, submit_payments"],
];

export default async function AdminUsersPage() {
  const profiles = await getProfiles();

  return (
    <div className="grid gap-4">
      <h2 className="text-2xl font-semibold">สิทธิ์ผู้ใช้งาน</h2>
      <Card>
        <h3 className="font-semibold">ตารางสิทธิ์ใน prototype</h3>
        <div className="mt-3 grid gap-3">
          {permissions.map(([role, copy]) => (
            <div key={role} className="rounded-md border border-border p-3">
              <p className="font-semibold">{role}</p>
              <p className="text-sm text-muted">{copy}</p>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold">ผู้ใช้งาน</h3>
        <div className="mt-3 grid gap-2">
          {profiles.map((profile) => (
            <div key={profile.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0">
              <span>{profile.email}</span>
              <span className="text-sm text-muted">{profile.role} · {profile.status}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
