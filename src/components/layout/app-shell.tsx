import Link from "next/link";
import { clsx } from "clsx";
import { LogOut } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { signOutCustomerAction } from "@/app/actions/auth";
import { MobileDrawerShell } from "@/components/layout/mobile-drawer-shell";
import { NavCurrentMarker } from "@/components/layout/nav-current-marker";
import { RouteContentFrame } from "@/components/layout/route-content-frame";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Profile } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: ComponentType<{ className?: string }>;
};

function MobileTabNav({ navItems }: { navItems: NavItem[] }) {
  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="mobile-tab-nav fixed inset-x-3 bottom-3 z-20 grid grid-flow-col auto-cols-fr overflow-hidden rounded-2xl border border-white/70 bg-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_42px_rgba(31,65,58,0.2)] backdrop-blur-2xl md:hidden"
    >
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-nav-href={item.href}
          className={clsx(
            "motion-surface flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold leading-tight text-muted transition-all duration-200 hover:bg-white/70 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
          )}
        >
          <item.icon className="h-[18px] w-[18px]" />
          <span className="max-w-full truncate">{item.mobileLabel ?? item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function MobileDrawerNav({
  navItems,
  profile,
}: {
  navItems: NavItem[];
  profile: Profile;
}) {
  return (
    <MobileDrawerShell profileEmail={profile.email}>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          data-nav-href={item.href}
          className="motion-surface flex min-h-10 items-center gap-2.5 rounded-lg border border-transparent px-2.5 text-sm font-semibold text-muted transition-all duration-200 hover:border-white/70 hover:bg-white/76 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/72 text-accent">
            <item.icon className="h-4 w-4" />
          </span>
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </MobileDrawerShell>
  );
}

export function AppShell({
  title,
  subtitle,
  navItems,
  profile,
  signOutAction = signOutCustomerAction,
  showHeaderSignOut = true,
  mobileNavMode = "tabs",
  children,
}: {
  title: string;
  subtitle?: string;
  navItems: NavItem[];
  profile: Profile;
  signOutAction?: () => Promise<void>;
  showHeaderSignOut?: boolean;
  mobileNavMode?: "tabs" | "drawer";
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "min-h-screen bg-transparent md:pb-0",
        mobileNavMode === "drawer" ? "pb-24" : "pb-28",
      )}
    >
      <NavCurrentMarker />
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        ข้ามไปยังเนื้อหา
      </a>
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/82 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-normal text-accent">
              NAK Wholesale
            </p>
            <h1 className="text-base font-semibold">{title}</h1>
            {subtitle ? <p className="break-words text-xs text-muted">{subtitle}</p> : null}
          </div>
          {showHeaderSignOut ? (
            <form action={signOutAction}>
              <SubmitButton variant="secondary" pendingLabel="กำลังออก..." className="px-3">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">ออกจากระบบ</span>
              </SubmitButton>
            </form>
          ) : null}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav aria-label="เมนูหลัก" className="sticky top-4 grid gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-nav-href={item.href}
                className="motion-surface flex min-h-10 items-center gap-2 rounded-lg border border-transparent px-2.5 text-sm font-medium text-muted transition-all duration-200 hover:border-white/70 hover:bg-white/72 hover:text-foreground hover:shadow-[0_10px_22px_rgba(31,65,58,0.09)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="main-content" className="min-w-0" tabIndex={-1}>
          <RouteContentFrame>{children}</RouteContentFrame>
        </main>
      </div>

      {mobileNavMode === "drawer" ? (
        <MobileDrawerNav navItems={navItems} profile={profile} />
      ) : (
        <MobileTabNav navItems={navItems} />
      )}

      <div className="sr-only">Signed in as {profile.email}</div>
    </div>
  );
}
