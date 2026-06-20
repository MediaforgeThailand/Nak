"use client";

import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

export function RouteContentFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeSignature = `${pathname}?${searchParams.toString()}`;

  return (
    <div key={routeSignature} className="motion-page">
      {children}
    </div>
  );
}
