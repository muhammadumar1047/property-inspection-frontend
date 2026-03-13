"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";

type DropdownContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
};

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLElement | null>(null);
  return (
    <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef, contentRef }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild = false, children, className = "" }: { asChild?: boolean; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) return asChild ? <>{children}</> : <button className={className}>{children}</button>;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    ctx.setIsOpen(!ctx.isOpen);
  };

  if (asChild && React.isValidElement(children)) {
    const mergedRef = (node: HTMLElement) => {
      (ctx.triggerRef as any).current = node;
      const childRef = (children as any).ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef && typeof childRef === 'object') childRef.current = node;
    };
    return React.cloneElement(children as any, {
      ref: mergedRef,
      onClick: (e: any) => {
        (children as any).props?.onClick?.(e);
        handleClick(e);
      },
      'aria-expanded': ctx.isOpen,
      'aria-haspopup': true,
    });
  }
  return (
    <button className={className} onClick={handleClick} ref={ctx.triggerRef as any} aria-expanded={ctx.isOpen} aria-haspopup type="button">
      {children}
    </button>
  );
}

export function DropdownMenuContent({ className = "", align = "end", forceMount, children }: { className?: string; align?: "start" | "end"; forceMount?: boolean; children: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext);
  const ref = (ctx?.contentRef as React.RefObject<HTMLDivElement>) || React.createRef<HTMLDivElement>();
  const [position, setPosition] = React.useState<{ top: number; left: number; minWidth?: number }>({ top: 0, left: 0 });
  const [placement, setPlacement] = React.useState<'top' | 'bottom'>('bottom');
  const [anim, setAnim] = React.useState(false);

  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent | TouchEvent) => {
      if (!ctx?.isOpen) return;
      const target = e.target as Node;
      const contentEl = ref.current as unknown as HTMLElement | null;
      const triggerEl = (ctx.triggerRef.current as unknown as HTMLElement | null);
      const insideContent = !!contentEl && contentEl.contains(target);
      const onTrigger = !!triggerEl && triggerEl.contains(target);
      if (!insideContent && !onTrigger) ctx.setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctx?.setIsOpen(false);
    };
    document.addEventListener("click", onClickOutside, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClickOutside, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  // Compute fixed-position portal coordinates so menus aren't clipped by overflow containers
  const computePosition = React.useCallback(() => {
    if (!ctx?.isOpen) return;
    const triggerEl = (ctx.triggerRef.current as unknown as HTMLElement | null);
    const contentEl = ref.current as unknown as HTMLElement | null;
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 8;
    let minWidth = rect.width;
    let contentWidth = contentEl?.offsetWidth || 192;
    let left = align === 'end' ? rect.right - contentWidth : rect.left;
    if (left + contentWidth > vw - 8) left = vw - 8 - contentWidth;
    if (left < 8) left = 8;
    const contentHeight = contentEl?.offsetHeight || 240;
    const below = vh - rect.bottom;
    const above = rect.top;
    let top = rect.bottom + gap;
    let side: 'top' | 'bottom' = 'bottom';
    if (below < contentHeight + 16 && above > contentHeight + 16) {
      top = Math.max(8, rect.top - gap - contentHeight);
      side = 'top';
    }
    setPlacement(side);
    setPosition({ top, left, minWidth });
  }, [ctx?.isOpen, align]);

  React.useLayoutEffect(() => {
    if (!ctx?.isOpen) return;
    computePosition();
    requestAnimationFrame(() => computePosition());
    setAnim(false);
    requestAnimationFrame(() => setAnim(true));
  }, [ctx?.isOpen, computePosition]);

  React.useEffect(() => {
    if (!ctx?.isOpen) return;
    const handler = () => computePosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    let ro: ResizeObserver | null = null;
    if (ref.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => computePosition());
      ro.observe(ref.current);
    }
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
      ro?.disconnect();
    };
  }, [ctx?.isOpen, computePosition]);

  // Keyboard navigation for items
  React.useEffect(() => {
    if (!ctx?.isOpen) return;
    const container = ref.current as HTMLDivElement | null;
    if (!container) return;
    const items = Array.from(container.querySelectorAll('[data-dm-item]')) as HTMLElement[];
    if (items.length) {
      // prepare items to be focusable programmatically
      items.forEach((el) => el.setAttribute('tabindex', '-1'));
      items[0].focus();
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (!ctx?.isOpen) return;
      const list = Array.from((ref.current as HTMLDivElement | null)?.querySelectorAll('[data-dm-item]') || []) as HTMLElement[];
      if (!list.length) return;
      const activeIndex = list.findIndex((el) => el === document.activeElement);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = list[(activeIndex + 1 + list.length) % list.length];
        next?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = list[(activeIndex - 1 + list.length) % list.length];
        prev?.focus();
      } else if (e.key === 'Home') {
        e.preventDefault();
        list[0]?.focus();
      } else if (e.key === 'End') {
        e.preventDefault();
        list[list.length - 1]?.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement && (document.activeElement as HTMLElement).dataset?.dmItem === '1') {
          (document.activeElement as HTMLElement).click();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ctx?.isOpen]);

  const node = (
    <div
      ref={ref}
      className={`fixed z-[1000] min-w-[12rem] max-h-72 overflow-auto rounded-xl border border-[var(--border)] bg-white/98 backdrop-blur-sm p-2 shadow-2xl ring-1 ring-black/5 transition-[opacity,transform] duration-120 ease-out ${placement === 'bottom' ? 'origin-top' : 'origin-bottom'} ${anim ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-1 scale-95'} ${className}`}
      style={{ top: position.top, left: position.left, width: position.minWidth }}
    >
      {placement === 'bottom' ? (
        <span className="pointer-events-none absolute -top-1.5 right-4 block h-3 w-3 rotate-45 rounded-[2px] bg-white border-l border-t border-[var(--border)]"></span>
      ) : (
        <span className="pointer-events-none absolute -bottom-1.5 right-4 block h-3 w-3 rotate-45 rounded-[2px] bg-white border-r border-b border-[var(--border)]"></span>
      )}
      {children}
    </div>
  );

  if (!ctx || (!forceMount && !ctx.isOpen)) return null;
  return typeof window !== 'undefined' && typeof document !== 'undefined'
    ? ReactDOM.createPortal(node, document.body)
    : node;
}

export function DropdownMenuLabel({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`px-2 py-1.5 text-sm font-semibold ${className}`}>{children}</div>;
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-[var(--border)]" />;
}

export function DropdownMenuItem({ className = "", onClick, children }: { className?: string; onClick?: () => void; children?: React.ReactNode }) {
  const ctx = React.useContext(DropdownContext);
  const handleClick = () => {
    onClick?.();
    ctx?.setIsOpen(false);
  };
  return (
    <button data-dm-item="1" onClick={handleClick} className={`flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors hover:bg-primary/10 hover:text-primary focus:bg-primary/15 ${className}`}>
      {children}
    </button>
  );
}


