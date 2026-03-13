"use client";

import * as React from "react";

type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", checked, onCheckedChange, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={`h-4 w-4 cursor-pointer rounded border-[var(--muted-300)] text-[var(--primary)] transition-colors duration-150 focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
