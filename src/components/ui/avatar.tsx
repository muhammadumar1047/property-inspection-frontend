"use client";

import * as React from "react";

export function Avatar({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div
      className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--primary)]/20 ring-offset-2 ring-offset-white ${className}`}
    >
      {children}
    </div>
  );
}

export function AvatarImage({ src, alt = "", className = "" }: { src?: string; alt?: string; className?: string }) {
  if (!src) return null;
  return (
    <img
      className={`aspect-square h-full w-full rounded-full object-cover ${className}`}
      src={src}
      alt={alt}
    />
  );
}

export function AvatarFallback({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary-100)] to-[var(--primary-50)] text-[var(--primary)] font-semibold text-sm ${className}`}
    >
      {children}
    </div>
  );
}

export default Avatar;
