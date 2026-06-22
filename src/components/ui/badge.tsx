import { clsx } from "clsx";

const tones = {
  neutral: "border-border bg-white/72 text-muted",
  success: "border-emerald-200 bg-emerald-50 text-success",
  warning: "border-amber-200 bg-amber-50 text-warning",
  danger: "border-red-200 bg-red-50 text-danger",
  accent: "border-teal-200 bg-teal-50 text-accent",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
