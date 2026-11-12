"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { loadSession, type Session } from "@/app/session";
import { adminMobileNavItems, mobileNavItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void loadSession().then(setSession);
  }, [pathname]);

  const isAdminRoute = pathname.startsWith("/admin") || session?.role === "ADMIN";
  const items = isAdminRoute ? adminMobileNavItems : mobileNavItems;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden backdrop-blur-lg bg-surface/95"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[10px] font-bold transition-all ${
                  active
                    ? "text-brand-700"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  aria-hidden="true"
                  className={`size-5 transition-transform ${
                    active ? "scale-110 stroke-[2.25] text-brand-600" : "stroke-[1.75]"
                  }`}
                />
                <span className="truncate max-w-[56px] text-center">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
