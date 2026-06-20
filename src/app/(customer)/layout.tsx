import {
  ClipboardList,
  Home,
  PackageSearch,
  ReceiptText,
  ShoppingCart,
  UserRound,
  WalletCards,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireCustomer } from "@/lib/auth";

const navItems = [
  { href: "/home", label: "หน้าหลัก", icon: Home },
  { href: "/products", label: "สินค้า", icon: PackageSearch },
  { href: "/cart", label: "ตะกร้า", icon: ShoppingCart },
  { href: "/orders", label: "ออเดอร์", icon: ClipboardList },
  { href: "/payments/new", label: "ชำระ", icon: WalletCards },
  { href: "/transactions", label: "บัญชี", icon: ReceiptText },
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
      title="Customer Portal"
      subtitle={profile.company_name ?? profile.full_name ?? profile.email}
      navItems={navItems}
      profile={profile}
    >
      {children}
    </AppShell>
  );
}
