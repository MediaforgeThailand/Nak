import { clsx } from "clsx";

const tones = {
  neutral: "bg-[var(--chip)] text-muted",
  success: "bg-[#e7f4ec] text-[#1b7a4b]",
  warning: "bg-[#fbeedd] text-[#a35a10]",
  danger: "bg-[#fbe6e3] text-[#b42318]",
  accent: "bg-[var(--p-soft)] text-[var(--p-deep)]",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
