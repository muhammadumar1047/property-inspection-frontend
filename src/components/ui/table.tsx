"use client";

import * as React from "react";

export const Table = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
);

export const TableHeader = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={`border-b border-[var(--border)] ${className}`} {...props} />
);

export const TableBody = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />
);

export const TableRow = ({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={`border-b border-[var(--border)]/60 transition-colors duration-150 hover:bg-[var(--muted-50)] even:bg-[var(--muted-50)]/40 ${className}`}
    {...props}
  />
);

export const TableHead = ({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={`h-11 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-[var(--muted-500)] ${className}`}
    {...props}
  />
);

export const TableCell = ({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={`px-4 py-3 align-middle text-[var(--foreground)] ${className}`} {...props} />
);
