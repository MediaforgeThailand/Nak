"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const activeClasses = ["bg-surface-muted", "text-foreground"];

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
