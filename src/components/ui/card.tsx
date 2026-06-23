import { clsx } from "clsx";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <section
      className={clsx(
        "min-w-0 rounded-[var(--r)] border border-[var(--card-line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-xl",
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
    default: "text-[var(--ink)]",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];

  return (
    <div className="min-w-0 rounded-[var(--r)] border border-[var(--card-line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] backdrop-blur-xl">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
