"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  Contrast,
  Download,
  History,
  Languages,
  Lock,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  ShieldCheck,
  Sliders,
  Type,
  UserPlus,
  X,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { clearSession, loadSession, type Session } from "@/app/session";

export function HamburgerMenu({
  onVoiceClick,
}: {
  onVoiceClick?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [bigText, setBigText] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    void loadSession().then(setSession);
  }, [pathname]);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Sync Accessibility Attributes on Document Body
  useEffect(() => {
    if (bigText) {
      document.documentElement.setAttribute("data-font-scale", "big");
    } else {
      document.documentElement.removeAttribute("data-font-scale");
    }
  }, [bigText]);

  useEffect(() => {
    if (contrast) {
      document.documentElement.setAttribute("data-contrast", "true");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
  }, [contrast]);

  async function handleLogout() {
    await clearSession();
    setSession(null);
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  const menuContent = (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-annita-navy-950/70 backdrop-blur-xl animate-overlay-in font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="flex h-full w-[88%] max-w-sm flex-col border-l border-white/10 bg-surface shadow-2xl animate-modal-in">
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex size-10 items-center justify-center rounded-xl border border-border bg-muted/50 text-foreground hover:bg-muted active:scale-95 transition-all"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        {/* Session Banner */}
        {session && (
          <div className="border-b border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 font-extrabold text-white text-sm shadow-xs">
                {session.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{session.name}</p>
                <p className="truncate text-xs text-muted-foreground">{session.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Drawer Scroll Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          {/* Navigation Links */}
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
              Navigation
            </p>
            <ul className="flex flex-col gap-1.5">
              <li>
                <Link
                  href="/"
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    pathname === "/"
                      ? "bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <MessageSquare className="size-5 text-brand-600" />
                  <span>AI Chat & Send</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/claim"
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    pathname.startsWith("/claim")
                      ? "bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Download className="size-5 text-brand-600" />
                  <span>Claim Transfer</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/purpose-lock"
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    pathname === "/purpose-lock"
                      ? "bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Lock className="size-5 text-brand-600" />
                  <span>Purpose Lock Config</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    pathname === "/dashboard"
                      ? "bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <History className="size-5 text-brand-600" />
                  <span>Transfers Ledger</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Preferences & Accessibility Card */}
          <div className="rounded-3xl border border-border bg-muted/30 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sliders className="size-4 text-brand-600" />
                Preferences & Accessibility
              </span>
              <span className="text-[10px] font-bold uppercase text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                Adaptive
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Voice Assistant */}
              {onVoiceClick && (
                <button
                  type="button"
                  onClick={() => {
                    onVoiceClick();
                    setOpen(false);
                  }}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-xs font-semibold text-foreground hover:bg-brand-50 hover:border-brand-300 transition-all text-left"
                >
                  <span className="flex items-center gap-2">
                    <Mic className="size-4 text-brand-600" />
                    Voice Assistant
                  </span>
                  <span className="text-[11px] font-bold text-brand-700">Tap to Speak</span>
                </button>
              )}

              {/* Big Text Scaling */}
              <button
                type="button"
                onClick={() => setBigText(!bigText)}
                className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition-all text-left ${
                  bigText
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Type className="size-4 text-brand-600" />
                  Dynamic Big Text
                </span>
                {bigText && <Check className="size-4 text-brand-700" />}
              </button>

              {/* High Contrast */}
              <button
                type="button"
                onClick={() => setContrast(!contrast)}
                className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition-all text-left ${
                  contrast
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Contrast className="size-4 text-brand-600" />
                  High Contrast Mode
                </span>
                {contrast && <Check className="size-4 text-brand-700" />}
              </button>

              {/* Simple Words */}
              <button
                type="button"
                onClick={() => setSimpleMode(!simpleMode)}
                className={`flex items-center justify-between rounded-xl border p-3 text-xs font-semibold transition-all text-left ${
                  simpleMode
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-border bg-surface text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Languages className="size-4 text-brand-600" />
                  Simple Language Mode
                </span>
                {simpleMode && <Check className="size-4 text-brand-700" />}
              </button>
            </div>
          </div>

          {/* Pilot Info Box */}
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4">
            <p className="flex items-center gap-1.5 text-xs font-bold text-brand-800">
              <ShieldCheck className="size-4 text-brand-600" />
              OpenRouter AI Escrow Guard
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Multi-model OpenRouter AI intent engine with strict receipt check before mobile money disburse.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4">
          {session ? (
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 py-3 text-sm font-semibold text-danger hover:bg-danger/20 transition-all active:scale-[0.98]"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" className="btn btn-primary btn-block gap-2">
                <LogIn className="size-4" /> Sign in
              </Link>
              <Link href="/signup" className="btn btn-secondary btn-block gap-2">
                <UserPlus className="size-4" /> Create account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu and accessibility preferences"
        aria-expanded={open}
        className="flex size-11 items-center justify-center rounded-2xl border border-border bg-surface text-foreground shadow-xs hover:bg-muted active:scale-95 transition-all cursor-pointer"
      >
        <Menu aria-hidden="true" className="size-5 text-annita-navy-900" />
      </button>

      {open && mounted && createPortal(menuContent, document.body)}
    </div>
  );
}
