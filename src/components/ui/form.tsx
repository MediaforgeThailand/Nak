import { clsx } from "clsx";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export { Select } from "@/components/ui/select";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-[var(--ink)]">
      <span className="text-[12.5px]">{label}</span>
      {children}
      {hint ? <span className="text-[11.5px] font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

const fieldBase =
  "w-full min-w-0 rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] text-sm text-[var(--ink)] outline-none transition-colors duration-200 placeholder:text-muted focus:border-[var(--p)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--p)_18%,transparent)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldBase, "min-h-11 px-3 py-2.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(fieldBase, "min-h-20 px-3 py-2.5", className)} {...props} />;
}
