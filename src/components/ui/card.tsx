import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={clsx(
        "min-w-0 rounded-lg border border-white/70 bg-white/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_34px_rgba(31,65,58,0.09)] backdrop-blur-2xl",
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
    <div className="min-w-0 rounded-lg border border-white/70 bg-white/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_34px_rgba(31,65,58,0.09)] backdrop-blur-2xl">
      <p className="text-xs font-medium uppercase tracking-normal text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}
