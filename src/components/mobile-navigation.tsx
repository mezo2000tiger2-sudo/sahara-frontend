"use client";

import Link from "next/link";
import { LogIn, MessageCircle, MessagesSquare, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileNavigation({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const transition = { duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" as const };

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    const desktop = window.matchMedia("(min-width: 768px)");
    const close = () => setOpen(false);
    desktop.addEventListener("change", close);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      desktop.removeEventListener("change", close);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return <div ref={root} className="md:hidden">
    <Button ref={trigger} type="button" variant="outline" size="icon" className="rounded-xl border-outline bg-surface" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
      <span className="relative size-5" aria-hidden="true">
        <m.span className="absolute top-1/2 left-0 h-0.5 w-5 rounded-full bg-current" animate={{ y: open ? -1 : -5, rotate: open ? 45 : 0 }} transition={transition} />
        <m.span className="absolute top-1/2 left-0 h-0.5 w-5 rounded-full bg-current" animate={{ y: open ? -1 : 3, rotate: open ? -45 : 0 }} transition={transition} />
      </span>
    </Button>
    <m.nav id={menuId} aria-label="Mobile navigation" aria-hidden={!open} inert={!open} initial={false}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={{ height: { ...transition, delay: open || reduceMotion ? 0 : 0.12 }, opacity: { ...transition, delay: open || reduceMotion ? 0 : 0.12 } }}
      className="absolute inset-x-0 top-full overflow-hidden border-b border-outline bg-surface shadow-soft">
      <div className="page-shell space-y-1 pt-3 pb-5">
        {links.map(({ href, label }, index) => {
          const Icon = href === "/message" ? MessagesSquare : href === "/conversation" ? MessageCircle : href === "/profile" ? UserRound : LogIn;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <m.div key={href} initial={false} animate={{ x: open ? 0 : -28, opacity: open ? 1 : 0 }}
            transition={{ ...transition, delay: reduceMotion ? 0 : open ? 0.06 + index * 0.055 : (links.length - index - 1) * 0.025 }}>
            <Link href={href} aria-current={active ? "page" : undefined} className="group flex min-h-14 items-center gap-4 rounded-xl px-3 text-base font-medium text-ink outline-none transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-focus aria-[current=page]:bg-main-soft aria-[current=page]:text-main" onClick={() => setOpen(false)}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-page text-ink-muted group-aria-[current=page]:bg-main group-aria-[current=page]:text-main-foreground"><Icon className="size-5" strokeWidth={1.7} aria-hidden="true" /></span>
              {label}
            </Link>
          </m.div>;
        })}
        <m.div initial={false} animate={{ x: open ? 0 : -28, opacity: open ? 1 : 0 }} transition={{ ...transition, delay: reduceMotion ? 0 : open ? 0.06 + links.length * 0.055 : 0 }} className={`flex items-center justify-between gap-4 px-3 pt-4 ${links.length ? "mt-3 border-t border-outline" : ""}`}>
          <span className="text-sm font-medium text-ink-muted">Appearance</span>
          <ThemeToggle />
        </m.div>
      </div>
    </m.nav>
  </div>;
}
