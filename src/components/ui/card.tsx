"use client";

import * as React from "react";

export const Card = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] ${className}`}
    {...props}
  />
);

export const CardHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pb-2 ${className}`} {...props} />
);

export const CardTitle = ({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-semibold leading-tight tracking-tight text-[var(--foreground)] ${className}`} {...props} />
);

export const CardDescription = ({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`mt-1 text-sm text-[var(--muted-foreground)] ${className}`} {...props} />
);

export const CardContent = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-4 ${className}`} {...props} />
);

export const CardFooter = ({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center px-6 pb-6 pt-0 ${className}`} {...props} />
);

export default Card;
