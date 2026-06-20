import {
  ClipboardList,
  Home,
  Package,
  Settings,
  Shield,
  Users,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/auth";

const navItems = [
  { href: "/admin/home", label: "แดชบอร์ด", icon: Home },
  { href: "/admin/products", label: "สินค้า", icon: Package },
  { href: "/admin/stock", label: "สต็อก", icon: Warehouse },
  { href: "/admin/orders", label: "ออเดอร์", icon: ClipboardList },
  { href: "/admin/payments", label: "สลิป", icon: WalletCards },
  { href: "/admin/customers", label: "ลูกค้า", icon: Users },
  { href: "/admin/users", label: "สิทธิ์", icon: Shield },
  { href: "/admin/settings", label: "ตั้งค่า", icon: Settings },
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();

  return (
    <AppShell
      title="Admin Operations"
      subtitle={`${profile.role} · ${profile.email}`}
      navItems={navItems}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}
