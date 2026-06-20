import Link from "next/link";
import { clsx } from "clsx";
import { LogOut } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { signOutCustomerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export function AppShell({
  title,
  subtitle,
  navItems,
  profile,
  signOutAction = signOutCustomerAction,
  children,
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  profile: Profile;
  signOutAction?: () => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-accent">
              Nak Inventory
            </p>
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
          </div>
          <form action={signOutAction}>
            <Button variant="secondary" type="submit" className="px-3">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-4 grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-border bg-surface md:hidden">
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-muted",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sr-only">Signed in as {profile.email}</div>
    </div>
  );
}
