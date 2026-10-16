"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Check,
  Coins,
  Contrast,
  Fingerprint,
  FlaskConical,
  Globe2,
  KeyRound,
  Languages,
  Loader2,
  LogOut,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
} from "lucide-react";
import { clearSession, loadSession, type Session } from "../session";

type Prefs = {
  requireApproval: boolean;
  requirePin: boolean;
  refundApproval: boolean;
  bigText: boolean;
  contrast: boolean;
  simpleMode: boolean;
  notifyTransfers: boolean;
  notifyEscrow: boolean;
  notifyClaims: boolean;
  provider: string;
  country: string;
};

const DEFAULT_PREFS: Prefs = {
  requireApproval: true,
  requirePin: true,
  refundApproval: true,
  bigText: false,
  contrast: false,
  simpleMode: false,
  notifyTransfers: true,
  notifyEscrow: true,
  notifyClaims: true,
  provider: "Lonestar Cell (MTN) MoMo",
  country: "Liberia",
};

const PROVIDERS = [
  "Lonestar Cell (MTN) MoMo",
  "Orange Money Liberia",
  "Wave",
  "MTN MoMo",
  "M-Pesa",
];

const PAYOUT_COUNTRIES = [
  "Liberia",
  "Nigeria",
  "Ghana",
  "Sierra Leone",
  "Guinea",
  "Côte d'Ivoire",
  "Kenya",
  "Uganda",
  "Tanzania",
  "South Africa",
  "Other",
];

const PREFS_KEY = "ezri:prefs";

function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
        checked
          ? "border-brand-300 bg-brand-50/60"
          : "border-border bg-surface hover:bg-muted"
      }`}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
        <span className="min-w-0">
          <span className="block text-xs font-bold text-foreground">{label}</span>
          {hint ? (
            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
              {hint}
            </span>
          ) : null}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow-sm transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function SectionCard({
  title,
  icon: Icon,
  badge,
  children,
}: {
  title: string;
  icon: LucideIcon;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Icon aria-hidden="true" className="size-4 text-brand-600" />
          {title}
        </h2>
        {badge ? (
          <span className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
            {badge}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SettingsContent() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    void loadSession().then((s) => {
      if (!s) {
        router.replace("/login?next=/settings");
        return;
      }
      setSession(s);
      setPrefs(readPrefs());
      setLoading(false);
    });
  }, [router]);

  // Persist preferences + apply accessibility attributes app-wide.
  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {}
    if (prefs.bigText) {
      document.documentElement.setAttribute("data-font-scale", "big");
    } else {
      document.documentElement.removeAttribute("data-font-scale");
    }
    if (prefs.contrast) {
      document.documentElement.setAttribute("data-contrast", "true");
    } else {
      document.documentElement.removeAttribute("data-contrast");
    }
  }, [prefs]);

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [key]: value }));

  async function handleLogout() {
    await clearSession();
    setSession(null);
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 aria-hidden="true" className="size-7 text-brand-600 motion-safe:animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-extrabold text-foreground sm:text-2xl">
          <Sparkles aria-hidden="true" className="size-5 text-brand-600" />
          App settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Account, money-movement approvals, payout defaults and accessibility — all in one place.
        </p>
      </div>

      {/* Account */}
      <SectionCard title="Account" icon={UserRound} badge="Signed in">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-extrabold text-white shadow-xs">
            {(session?.name || "S").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{session?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{session?.email}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="btn btn-secondary gap-2 justify-center"
          >
            <LogOut aria-hidden="true" className="size-4" /> Sign out of this device
          </button>
        </div>
      </SectionCard>

      {/* Money movement approvals */}
      <SectionCard title="Money movement approvals" icon={ShieldCheck} badge="Always on">
        <p className="text-xs leading-5 text-muted-foreground">
          Ezri AI never moves money on its own. Before every action the agent stops, shows what it
          is about to do, and waits for you.
        </p>
        <Toggle
          checked={prefs.requireApproval}
          onChange={(v) => set("requireApproval", v)}
          icon={Check}
          label="Approve every transfer before it runs"
          hint="The agent pauses and waits for your explicit OK before creating an escrow."
        />
        <Toggle
          checked={prefs.requirePin}
          onChange={(v) => set("requirePin", v)}
          icon={KeyRound}
          label="Require 4-digit PIN to move money"
          hint="PIN confirmation is requested inside the chat before PayPal is touched."
        />
        <Toggle
          checked={prefs.refundApproval}
          onChange={(v) => set("refundApproval", v)}
          icon={Fingerprint}
          label="Ask before refunds & sender overrides"
          hint="Auto-refunds and AI-fail overrides always come back to you first."
        />
        <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs">
          <span className="font-bold text-brand-800">Demo money PIN</span>
          <span className="font-mono font-extrabold tracking-[0.3em] text-brand-900">1234</span>
        </div>
      </SectionCard>

      {/* Payout defaults */}
      <SectionCard title="Payout defaults" icon={Coins} badge="Mobile money">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-provider" className="text-xs font-bold text-foreground">
              Preferred payout provider
            </label>
            <select
              id="settings-provider"
              value={prefs.provider}
              onChange={(e) => set("provider", e.target.value)}
              className="input text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="settings-country" className="text-xs font-bold text-foreground">
              Default payout country
            </label>
            <select
              id="settings-country"
              value={prefs.country}
              onChange={(e) => set("country", e.target.value)}
              className="input text-sm"
            >
              {PAYOUT_COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs">
          <span className="flex items-center gap-2 font-bold text-foreground">
            <Globe2 aria-hidden="true" className="size-4 text-brand-600" /> Live FX rate
          </span>
          <span className="font-mono font-extrabold text-foreground">1 USD = 192 LRD</span>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="Notifications" icon={Bell}>
        <Toggle
          checked={prefs.notifyTransfers}
          onChange={(v) => set("notifyTransfers", v)}
          icon={Sparkles}
          label="Transfer alerts"
          hint="Escrow created, captured, held and released."
        />
        <Toggle
          checked={prefs.notifyEscrow}
          onChange={(v) => set("notifyEscrow", v)}
          icon={ShieldCheck}
          label="Escrow & proof events"
          hint="When the receiver submits a bill photo and the AI verdict arrives."
        />
        <Toggle
          checked={prefs.notifyClaims}
          onChange={(v) => set("notifyClaims", v)}
          icon={Bell}
          label="Claim link updates"
          hint="When a receiver opens or claims one of your transfers."
        />
      </SectionCard>

      {/* Accessibility */}
      <SectionCard title="Accessibility" icon={Type} badge="Adaptive">
        <Toggle
          checked={prefs.bigText}
          onChange={(v) => set("bigText", v)}
          icon={Type}
          label="Dynamic big text"
          hint="Scales the whole app text up for easier reading."
        />
        <Toggle
          checked={prefs.contrast}
          onChange={(v) => set("contrast", v)}
          icon={Contrast}
          label="High contrast mode"
          hint="Stronger borders and colors across every screen."
        />
        <Toggle
          checked={prefs.simpleMode}
          onChange={(v) => set("simpleMode", v)}
          icon={Languages}
          label="Simple language mode"
          hint="Plain wording in assistant replies and confirmations."
        />
      </SectionCard>

      {/* Demo environment */}
      <SectionCard title="Demo environment" icon={FlaskConical} badge="Hackathon">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <span className="font-bold text-foreground">PayPal</span>
            <span className="rounded-full border border-brand-300 bg-brand-100 px-2.5 py-0.5 font-extrabold text-brand-900">
              Sandbox · mock when no keys
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <span className="font-bold text-foreground">Mobile money</span>
            <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 font-extrabold text-amber-800">
              MOCK
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <span className="font-bold text-foreground">Escrow auto-refund</span>
            <span className="font-mono font-extrabold text-foreground">48 hours</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <span className="font-bold text-foreground">API</span>
            <span className="font-mono font-bold text-foreground">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
            </span>
          </div>
        </div>
        <p className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-[11px] leading-4 text-brand-800">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
          PayPal sandbox becomes live as soon as client keys are set; everything else stays
          deterministic so judges can run the demo with zero configuration.
        </p>
      </SectionCard>
    </div>
  );
}
