import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

const variants = {
  primary: "border border-white/55 bg-accent/92 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.42),0_12px_28px_rgba(15,118,110,0.26)] hover:bg-accent",
  secondary: "border border-white/70 bg-white/78 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_10px_24px_rgba(31,65,58,0.1)] backdrop-blur-xl hover:bg-white/92",
  danger: "border border-white/35 bg-danger/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_26px_rgba(180,35,24,0.24)] hover:bg-danger",
  ghost: "bg-transparent text-foreground hover:bg-white/60",
};

type ButtonProps = ComponentProps<"button"> & {
  variant?: keyof typeof variants;
};

export type { ButtonProps };

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        "motion-surface inline-flex min-h-9 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-center text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
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
    <Link
      prefetch={prefetch}
      className={clsx(
        "motion-surface inline-flex min-h-9 cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-center text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
