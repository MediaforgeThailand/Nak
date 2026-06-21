"use client";

import { ArrowLeft } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

const STACK_KEY = "nak-route-stack-v1";
const STACK_LIMIT = 30;

function readStack() {
  try {
    const value = window.sessionStorage.getItem(STACK_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    window.sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-STACK_LIMIT)));
  } catch {
    // LINE in-app browser can occasionally restrict sessionStorage.
  }
}

function fallbackRoute(currentRoute: string) {
  if (currentRoute.startsWith("/admin")) return "/admin/home";
  if (currentRoute === "/" || currentRoute.startsWith("/login")) return "/home";
  return "/home";
}

export function FloatingBackButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const routeSignature = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    const stack = readStack();
    const last = stack.at(-1);
    if (last === routeSignature) return;

    const existingIndex = stack.lastIndexOf(routeSignature);
    const nextStack =
      existingIndex >= 0 ? stack.slice(0, existingIndex + 1) : [...stack, routeSignature];
    writeStack(nextStack);
  }, [routeSignature]);

  const keepLineBrowserOpen = useCallback(() => {
    const state = window.history.state;
    window.history.replaceState({ ...state, nakPage: true }, "", window.location.href);
    window.history.pushState({ nakBackGuard: true }, "", window.location.href);
  }, []);

  const goBackInsideApp = useCallback(() => {
    const stack = readStack();
    const currentIndex = stack.lastIndexOf(routeSignature);
    const target =
      currentIndex > 0 ? stack[currentIndex - 1] : fallbackRoute(routeSignature);

    if (target === routeSignature) {
      keepLineBrowserOpen();
      return;
    }

    const nextStack = currentIndex > 0 ? stack.slice(0, currentIndex) : [target];
    writeStack(nextStack);
    router.push(target);
  }, [keepLineBrowserOpen, routeSignature, router]);

  useEffect(() => {
    keepLineBrowserOpen();
  }, [keepLineBrowserOpen, routeSignature]);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.nakPage || event.state?.nakBackGuard) {
        goBackInsideApp();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [goBackInsideApp]);

  return (
    <button
      type="button"
      className="floating-back-button motion-surface fixed right-3 z-[50] grid h-11 w-11 place-items-center rounded-full border border-white/70 bg-white/90 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(31,65,58,0.22)] backdrop-blur-2xl transition-all duration-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      aria-label="ย้อนกลับหน้าก่อนหน้า"
      title="ย้อนกลับ"
      onClick={goBackInsideApp}
    >
      <ArrowLeft className="h-5 w-5 text-accent" />
    </button>
  );
}
