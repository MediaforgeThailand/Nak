import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={clsx(
        "min-w-0 rounded-2xl border border-white/55 bg-white/64 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_50px_rgba(36,78,128,0.12)] backdrop-blur-2xl",
        className,
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <div className="min-w-0 rounded-2xl border border-white/55 bg-white/64 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_18px_50px_rgba(36,78,128,0.12)] backdrop-blur-2xl">
      <p className="text-xs font-medium uppercase tracking-normal text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
