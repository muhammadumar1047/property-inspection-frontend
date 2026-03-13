"use client";

import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
};

const base =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium cursor-pointer select-none transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-10 w-10 p-0",
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default:
    "bg-[var(--primary)] text-white shadow-sm hover:bg-[var(--primary-hover)] hover:shadow-md",
  secondary:
    "bg-[var(--secondary)] text-white shadow-sm hover:bg-[var(--secondary-hover)] hover:shadow-md",
  destructive:
    "bg-[var(--destructive)] text-white shadow-sm hover:bg-[var(--destructive-hover)] hover:shadow-md",
  outline:
    "border border-[var(--border)] bg-white text-[var(--foreground)] shadow-sm hover:bg-[var(--muted-50)] hover:border-[var(--muted-300)]",
  ghost:
    "bg-transparent text-[var(--muted-600)] hover:bg-[var(--muted-100)] hover:text-[var(--foreground)]",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export default Button;
