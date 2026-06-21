"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { clsx } from "clsx";

export function MobileDrawerShell({
  profileEmail,
  children,
}: {
  profileEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [openPathname, setOpenPathname] = useState<string | null>(null);
  const isOpen = openPathname === pathname;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenPathname(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className={clsx(
          "mobile-drawer-button motion-surface fixed bottom-4 left-4 right-4 z-30 mx-auto inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full border border-white/70 bg-white/88 px-5 text-sm font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_18px_42px_rgba(31,65,58,0.22)] backdrop-blur-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          isOpen && "translate-y-2 scale-[0.98] opacity-0 pointer-events-none",
        )}
        aria-controls="mobile-admin-drawer"
        aria-expanded={isOpen}
        onClick={() => setOpenPathname(pathname)}
      >
        <Menu className="h-5 w-5 text-accent" />
        เมนูหลังบ้าน
      </button>

      <div
        id="mobile-admin-drawer"
        className="mobile-drawer fixed inset-0 z-40"
        data-open={isOpen ? "true" : "false"}
        aria-hidden={!isOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-foreground/28 backdrop-blur-sm"
          aria-label="ปิดเมนูหลังบ้าน"
          tabIndex={isOpen ? 0 : -1}
          onClick={() => setOpenPathname(null)}
        />
        <aside className="mobile-drawer-panel absolute bottom-0 left-0 top-0 grid w-[min(86vw,340px)] grid-rows-[auto_1fr] overflow-hidden border-r border-white/70 bg-white/92 shadow-[0_24px_80px_rgba(16,32,29,0.28)] backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-border p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-accent">
                NAK Admin
              </p>
              <h2 className="mt-1 text-lg font-semibold">เมนูหลังบ้าน</h2>
              <p className="mt-1 break-words text-xs text-muted">{profileEmail}</p>
            </div>
            <button
              type="button"
              className="motion-surface grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/70 bg-white/78 text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_10px_24px_rgba(31,65,58,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="ปิดเมนูหลังบ้าน"
              onClick={() => setOpenPathname(null)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav
            aria-label="เมนูหลังบ้านบนมือถือ"
            className="grid content-start gap-2 overflow-y-auto p-3"
            onClick={(event) => {
              const target = event.target;
              if (target instanceof Element && target.closest("a[data-nav-href]")) {
                setOpenPathname(null);
              }
            }}
          >
            {children}
          </nav>
        </aside>
      </div>
    </div>
  );
}
