"use client";

import { useState } from "react";
import { Icon } from "@/components/nak/icon";

/** Copies `text` to the clipboard with a touch-friendly confirmation state. */
export function CopyButton({
  text,
  label = "คัดลอกรหัสออเดอร์",
  copiedLabel = "คัดลอกแล้ว",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // LINE in-app browser / older WebViews may block the async clipboard API.
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: "100%",
        minHeight: 46,
        padding: "12px 14px",
        borderRadius: "var(--r-btn)",
        border: "1px solid transparent",
        background: copied ? "#e7f4ec" : "var(--p)",
        color: copied ? "#1b7a4b" : "#fff",
        fontSize: 14.5,
        fontWeight: 700,
        cursor: "pointer",
        transition: "background-color .2s ease, color .2s ease, transform .16s ease",
        boxShadow: copied ? "none" : "0 6px 16px -6px var(--p)",
      }}
    >
      <Icon name={copied ? "checkCircle" : "copy"} size={17} stroke={2.4} />
      {copied ? copiedLabel : label}
    </button>
  );
}
