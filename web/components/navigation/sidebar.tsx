"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark } from "@/components/brand/logo";
import { sidebarNavItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0] || "/";
  if (path === "/") {
    return pathname === "/";
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <Link href="/" aria-label="Ezri Africa home">
          <LogoMark size="sm" />
        </Link>
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-annita-navy-900"
        >
          Ezri Africa
        </Link>
      </div>
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {sidebarNavItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="px-4 py-3 text-xs text-muted-foreground">
        Proof Before Payout
      </p>
    </aside>
  );
}
