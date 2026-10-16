"use client";

import { usePathname } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Logo } from "@/components/brand/logo";
import { BottomNav } from "@/components/navigation/bottom-nav";
import { HamburgerMenu } from "@/components/navigation/hamburger-menu";
import { Sidebar } from "@/components/navigation/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/verify-email" ||
    pathname === "/verify-otp" ||
    pathname === "/two-factor";

  const isClaim = pathname.startsWith("/claim");
  const isHomeChat = pathname === "/";

  if (isAuth) {
    return <AuthShell>{children}</AuthShell>;
  }

  if (isClaim) {
    return (
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md">
          <span className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Receiver Claim Mode
            </span>
          </span>
          <HamburgerMenu />
        </header>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <main id="main-content" className="flex-1 pb-20 md:pb-0">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col bg-background ${
        isHomeChat ? "h-dvh max-h-dvh overflow-hidden" : "min-h-dvh"
      }`}
    >
      <Sidebar />
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur-md md:hidden">
        <Logo size="sm" />
        <HamburgerMenu />
      </header>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-64"
      >
        {isHomeChat ? (
          <div className="flex w-full min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </div>
        ) : (
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
