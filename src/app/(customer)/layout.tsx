import {
  ClipboardList,
  Home,
  PackageSearch,
  ReceiptText,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireCustomer } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "หน้าหลัก", icon: Home },
  { href: "/products", label: "สินค้า", icon: PackageSearch },
  { href: "/orders", label: "ออเดอร์", icon: ClipboardList },
  { href: "/transactions", label: "บัญชี", icon: ReceiptText },
  { href: "/cart", label: "ตะกร้า", icon: PackageSearch },
  { href: "/profile", label: "โปรไฟล์", icon: Home },
];

export const dynamic = "force-dynamic";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireCustomer();

  return (
    <AppShell
      title="Customer Portal"
      subtitle={profile.company_name ?? profile.full_name ?? profile.email}
      navItems={navItems}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}
