"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const activeClasses = [
  "border-white/70",
  "bg-white/78",
  "text-foreground",
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_12px_28px_rgba(37,99,235,0.14)]",
];

export function NavCurrentMarker() {
  const pathname = usePathname();

  useEffect(() => {
    const links = document.querySelectorAll<HTMLAnchorElement>("[data-nav-href]");
    links.forEach((link) => {
      const href = link.dataset.navHref ?? "";
      const isActive = pathname === href || pathname.startsWith(`${href}/`);

      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
      activeClasses.forEach((className) => link.classList.toggle(className, isActive));
    });
  }, [pathname]);

  return null;
}
