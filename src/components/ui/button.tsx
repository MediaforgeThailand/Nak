import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

const variants = {
  primary: "bg-[var(--p)] text-white shadow-[0_6px_16px_-6px_var(--p)] hover:brightness-[1.03]",
  secondary: "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line)] hover:bg-white",
  danger: "bg-[#fbe6e3] text-[#b42318] hover:brightness-[0.98]",
  ghost: "bg-transparent text-[var(--ink)] hover:bg-[var(--chip)]",
  soft: "bg-[var(--p-soft)] text-[var(--p-deep)] hover:brightness-[1.02]",
};

const base =
  "motion-surface inline-flex min-h-11 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-[var(--r-btn)] px-4 py-2.5 text-center text-sm font-bold leading-none tracking-[-.01em] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--p)] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
};

export type { ButtonProps };

export function Button({ className, variant = "primary", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={clsx(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  className,
  variant = "primary",
  children,
  prefetch = false,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: keyof typeof variants;
  children: ReactNode;
}) {
  return (
    <Link prefetch={prefetch} className={clsx(base, variants[variant], className)} {...props}>
      {children}
    </Link>
  );
}
