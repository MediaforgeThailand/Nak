import { AdminShell } from "@/components/nak/admin-shell";
import { requireStaff } from "@/lib/auth";
import { getAdminOrders, getPayments, getProfiles } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ profile }, orders, payments, profiles] = await Promise.all([
    requireStaff(),
    getAdminOrders(),
    getPayments("admin"),
    getProfiles(),
  ]);

  const badges = {
    orders: orders.filter((order) => order.status === "pending_admin").length,
    payments: payments.filter((payment) => payment.status === "pending").length,
    users: profiles.filter((p) => p.status === "pending").length,
  };

  return (
    <AdminShell email={profile.email} fullName={profile.full_name ?? ""} badges={badges} isAdmin={profile.role === "admin"}>
      {children}
    </AdminShell>
  );
}
