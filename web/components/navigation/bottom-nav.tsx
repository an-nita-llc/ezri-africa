"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadSession, type Session } from "@/app/session";
import { mobileNavItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void loadSession().then(setSession);
  }, [pathname]);

  const items = session
    ? mobileNavItems.filter((i) => i.href === "/" || i.href === "/dashboard")
    : mobileNavItems;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className={`grid ${items.length === 2 ? "grid-cols-2" : "grid-cols-4"}`}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors ${
                  active
                    ? "text-brand-700 font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-6 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
