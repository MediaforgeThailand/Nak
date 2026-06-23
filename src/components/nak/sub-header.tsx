"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/nak/icon";

export function SubHeader({
  title,
  right,
  fallbackHref = "/home",
}: {
  title: string;
  right?: ReactNode;
  fallbackHref?: string;
}) {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <div className="nak-subheader">
      <button onClick={goBack} className="nak-iconbtn" aria-label="ย้อนกลับ" type="button">
        <Icon name="chevL" size={20} stroke={2.4} />
      </button>
      <h2 style={{ flex: 1, fontSize: 17, fontWeight: 700, margin: 0, letterSpacing: "-.01em", minWidth: 0 }}>
        {title}
      </h2>
      {right}
    </div>
  );
}
