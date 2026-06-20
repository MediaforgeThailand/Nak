import Link from "next/link";
import { clsx } from "clsx";
import { LogOut } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { signOutCustomerAction } from "@/app/actions/auth";
import { NavCurrentMarker } from "@/components/layout/nav-current-marker";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
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
      <NavCurrentMarker />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-accent">
              Nak Inventory
            </p>
            <h1 className="text-lg font-semibold">{title}</h1>
            {subtitle ? <p className="break-words text-sm text-muted">{subtitle}</p> : null}
          </div>
          <form action={signOutAction}>
            <SubmitButton variant="secondary" pendingLabel="กำลังออก..." className="px-3">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">ออกจากระบบ</span>
            </SubmitButton>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav aria-label="เมนูหลัก" className="sticky top-4 grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-nav-href={item.href}
                className="flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted transition-colors duration-200 hover:bg-surface hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main-content" className="min-w-0" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav
        aria-label="เมนูหลักบนมือถือ"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-flow-col auto-cols-fr border-t border-border bg-surface shadow-[0_-8px_20px_rgba(0,0,0,0.04)] md:hidden"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-nav-href={item.href}
            className={clsx(
              "flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-tight text-muted transition-colors duration-200 hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate">
              {item.mobileLabel ?? item.label}
            </span>
          </Link>
        ))}
      </nav>

      <div className="sr-only">Signed in as {profile.email}</div>
    </div>
  );
}
