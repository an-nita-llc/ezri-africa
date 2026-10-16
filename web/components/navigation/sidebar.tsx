"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { clearSession, loadSession, type Session } from "@/app/session";
import { sidebarNavItems } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    void loadSession().then(setSession);
  }, [pathname]);

  async function handleLogout() {
    await clearSession();
    setSession(null);
    router.push("/login");
    router.refresh();
  }

  const items = session
    ? sidebarNavItems.filter((i) => i.href === "/" || i.href === "/dashboard")
    : sidebarNavItems;

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
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-50 text-brand-700 font-semibold"
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
      {session ? (
        <div className="border-t border-border p-3">
          <div className="mb-2 px-2 text-xs text-muted-foreground">
            <span className="block font-medium text-foreground truncate">{session.name}</span>
            <span className="block truncate">{session.email}</span>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-danger hover:bg-danger/10"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      ) : (
        <div className="border-t border-border p-3">
          <p className="px-2 text-xs text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="size-3.5 text-brand-600" /> Proof Before Payout
          </p>
        </div>
      )}
    </aside>
  );
}
