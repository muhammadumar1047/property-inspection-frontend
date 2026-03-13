"use client";

import * as React from "react";

type Variant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: "bg-primary/10 text-primary border border-primary/20",
  secondary: "bg-secondary/10 text-secondary border border-secondary/20",
  destructive: "bg-destructive/10 text-destructive border border-destructive/20",
  outline: "border border-[var(--border)] text-[var(--foreground)] bg-white",
  success: "bg-[var(--success-50)] text-[var(--success)] border border-[var(--success)]/20",
  warning: "bg-[var(--warning-50)] text-[var(--accent-700)] border border-[var(--warning)]/20",
  info: "bg-[var(--info-50)] text-[var(--info)] border border-[var(--info)]/20",
};

export const Badge: React.FC<BadgeProps> = ({ className = "", variant = "default", ...props }) => (
  <div
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
    {...props}
  />
);

export default Badge;
