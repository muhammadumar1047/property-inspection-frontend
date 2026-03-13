"use client";

import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>((
  { className = "", value, defaultValue, ...rest },
  ref
) => {
  const hasValueProp = Object.prototype.hasOwnProperty.call({ value }, "value");
  const inputProps: React.InputHTMLAttributes<HTMLInputElement> = { ...rest };

  if (hasValueProp) {
    inputProps.value = value ?? "";
  } else if (defaultValue !== undefined) {
    inputProps.defaultValue = defaultValue;
  }

  return (
    <input
      ref={ref}
      className={`h-11 w-full rounded-lg border border-[var(--border)] bg-white px-3.5 py-2 text-sm text-[var(--foreground)] shadow-sm transition-all duration-200 placeholder:text-[var(--muted-400)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 disabled:cursor-not-allowed disabled:bg-[var(--muted-50)] disabled:text-[var(--muted-400)] ${className}`}
      {...inputProps}
    />
  );
});
Input.displayName = "Input";

export default Input;
