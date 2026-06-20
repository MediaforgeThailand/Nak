import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

const variants = {
  primary: "border border-white/45 bg-accent/90 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_12px_28px_rgba(37,99,235,0.28)] hover:bg-accent",
  secondary: "border border-white/55 bg-white/62 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.76),0_10px_24px_rgba(36,78,128,0.12)] backdrop-blur-xl hover:bg-white/82",
  danger: "border border-white/35 bg-danger/90 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_26px_rgba(180,35,24,0.24)] hover:bg-danger",
  ghost: "bg-transparent text-foreground hover:bg-white/50",
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
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
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
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
