import {
  ClipboardList,
  PackageSearch,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireCustomer } from "@/lib/auth";

const navItems = [
  { href: "/home", label: "สินค้า", icon: PackageSearch },
  { href: "/orders", label: "ออเดอร์", icon: ClipboardList },
  { href: "/profile", label: "โปรไฟล์", icon: UserRound },
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
      title="Nak Customer"
      subtitle={profile.company_name ?? profile.full_name ?? profile.email}
      navItems={navItems}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}
