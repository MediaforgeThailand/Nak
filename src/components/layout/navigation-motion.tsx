"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isInternalRoute(anchor: HTMLAnchorElement) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;

  const current = `${window.location.pathname}${window.location.search}`;
  const next = `${url.pathname}${url.search}`;
  return current !== next;
}

export function NavigationMotion() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeSignature = `${pathname}?${searchParams.toString()}`;
  const [navigating, setNavigating] = useState(false);
  const fallbackTimer = useRef<number | null>(null);
  const delayedTimer = useRef<number | null>(null);

  useEffect(() => {
    if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
    if (delayedTimer.current) window.clearTimeout(delayedTimer.current);

    const frame = window.requestAnimationFrame(() => setNavigating(false));
    return () => window.cancelAnimationFrame(frame);
  }, [routeSignature]);

  useEffect(() => {
    function startNavigationFeedback(delay = 90) {
      if (delayedTimer.current) window.clearTimeout(delayedTimer.current);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);

      delayedTimer.current = window.setTimeout(() => setNavigating(true), delay);
      fallbackTimer.current = window.setTimeout(() => setNavigating(false), 4500);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as Element | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || !isInternalRoute(anchor)) return;

      startNavigationFeedback();
    }

    function handleSubmit(event: SubmitEvent) {
      if (event.defaultPrevented) return;
      startNavigationFeedback(180);
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      if (fallbackTimer.current) window.clearTimeout(fallbackTimer.current);
      if (delayedTimer.current) window.clearTimeout(delayedTimer.current);
    };
  }, []);

  if (!navigating) return null;

  return (
    <div aria-live="polite" aria-busy="true" className="pointer-events-none fixed inset-0 z-50">
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-accent/10">
        <div className="route-progress-bar h-full w-1/3 rounded-r-full bg-accent shadow-[0_0_22px_rgba(15,118,110,0.48)]" />
      </div>
      <div className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/86 px-3 py-2 text-xs font-semibold text-foreground shadow-[0_16px_36px_rgba(31,65,58,0.16)] backdrop-blur-2xl">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        กำลังโหลด
      </div>
    </div>
  );
}
