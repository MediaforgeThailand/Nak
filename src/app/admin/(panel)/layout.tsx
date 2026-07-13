import { AdminShell } from "@/components/nak/admin-shell";
import { requireStaff } from "@/lib/auth";
import { getAdminBadgeCounts } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, badges] = await Promise.all([
    requireStaff(),
    getAdminBadgeCounts(),
  ]);

  return (
    <AdminShell email={profile.email} fullName={profile.full_name ?? ""} badges={badges} isAdmin={profile.role === "admin"}>
      {children}
    </AdminShell>
  );
}
