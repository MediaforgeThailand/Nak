import { clsx } from "clsx";
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

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
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-foreground">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-muted">{hint}</span> : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "min-h-11 w-full min-w-0 rounded-lg border border-white/70 bg-white/82 px-3 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] outline-none backdrop-blur-xl transition-colors duration-200 placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "min-h-24 w-full min-w-0 rounded-lg border border-white/70 bg-white/82 px-3 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] outline-none backdrop-blur-xl transition-colors duration-200 placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "min-h-11 w-full min-w-0 rounded-lg border border-white/70 bg-white/82 px-3 py-2 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] outline-none backdrop-blur-xl transition-colors duration-200 focus:border-accent focus:ring-2 focus:ring-accent/20 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}
