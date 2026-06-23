import { CustomerShell } from "@/components/nak/customer-shell";
import { requireCustomer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await requireCustomer();

  return <CustomerShell>{children}</CustomerShell>;
}
