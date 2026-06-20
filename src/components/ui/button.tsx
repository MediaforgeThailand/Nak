import Link from "next/link";
import { clsx } from "clsx";
import type { ComponentProps, ReactNode } from "react";

const variants = {
  primary: "bg-accent text-accent-foreground hover:bg-[#275f42]",
  secondary: "bg-surface text-foreground border border-border hover:bg-surface-muted",
  danger: "bg-danger text-white hover:bg-[#961f16]",
  ghost: "bg-transparent text-foreground hover:bg-surface-muted",
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
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-center text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
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
        "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-center text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
