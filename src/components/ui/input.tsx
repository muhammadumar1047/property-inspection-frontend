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
    // Keep controlled inputs controlled even if parent passes undefined
    inputProps.value = value ?? "";
  } else if (defaultValue !== undefined) {
    inputProps.defaultValue = defaultValue;
  }

  return (
    <input
      ref={ref}
      className={`h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[var(--foreground)] shadow-sm outline-none ring-[var(--ring)] focus:ring-2 ${className}`}
      {...inputProps}
    />
  );
});
Input.displayName = "Input";

export default Input;





