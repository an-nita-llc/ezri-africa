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
  KeyRound,
  Languages,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Percent,
  ShieldCheck,
  Sparkles,
  Sun,
  Type,
  UserRound,
} from "lucide-react";
import { InfoRow, PageHeader, SectionCard, Toggle } from "@/components/ui/section-card";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf } from "../fx";
import { clearSession, loadSession, type Session } from "../session";
import {
  DEFAULT_PREFS,
  readPrefs,
  savePrefs,
  type FontFamilyPref,
  type FontScalePref,
  type Prefs,
  type ThemePref,
} from "../prefs";

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

export function SettingsContent() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadSession().then((s) => {
      if (!s) {
        router.replace("/login?next=/settings");
        return;
      }
      setSession(s);
      setPrefs(readPrefs());
      setLoaded(true);
      setLoading(false);
    });
  }, [router]);

  // Persist preferences + apply theme/typography app-wide. Gated on `loaded`
  // so opening Settings never clobbers what was saved on a previous visit.
  useEffect(() => {
    if (!loaded) return;
    savePrefs(prefs);
  }, [prefs, loaded]);

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
      <PageHeader
        title="App settings"
        subtitle="Account, money-movement approvals, fees, payout defaults and accessibility — all in one place."
      />

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
        <InfoRow
          label="Live FX rate"
          value={`1 USD = ${USD_LRD} LRD`}
          mono
          highlight
        />
      </SectionCard>

      {/* Fees — 2% of every transaction */}
      <SectionCard title="Fees" icon={Percent} badge={`${FEE_PCT_LABEL}% per transaction`}>
        <p className="text-xs leading-5 text-muted-foreground">
          Ezri charges a flat <strong className="text-foreground">{FEE_PCT_LABEL}%</strong> service
          fee on every transaction. The fee is paid by the sender, added to the PayPal charge, and is
          always shown for approval before any money moves — the receiver&apos;s payout is never reduced.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            label={`Example · $60 transfer`}
            value={`Fee $${feeOf(60).toFixed(2)} · Total $${(60 + feeOf(60)).toFixed(2)}`}
            mono
          />
          <InfoRow
            label="Receiver gets in full"
            value={`$60 → ${lrdOf(60).toLocaleString()} LRD`}
            mono
            highlight
          />
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs leading-4 text-brand-800">
          <Percent aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
          <span>
            Applied automatically on every PayPal capture and shown in the chat approval card, the
            Transfers Ledger and the receiver claim page. Refunds return the full charged amount
            including the fee.
          </span>
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

      {/* Appearance — theme + typography, applied live and persisted */}
      <SectionCard title="Appearance" icon={Palette} badge="Applies instantly">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-foreground">Theme</span>
          <Segmented<ThemePref>
            value={prefs.theme}
            onChange={(v) => set("theme", v)}
            options={[
              { value: "system", label: "System", icon: Monitor },
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-foreground">Text size</span>
          <Segmented<FontScalePref>
            value={prefs.fontScale}
            onChange={(v) => set("fontScale", v)}
            options={[
              { value: "compact", label: "Compact" },
              { value: "default", label: "Default" },
              { value: "big", label: "Big" },
              { value: "xl", label: "Extra large" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold text-foreground">Font</span>
          <Segmented<FontFamilyPref>
            value={prefs.fontFamily}
            onChange={(v) => set("fontFamily", v)}
            options={[
              { value: "default", label: "App default" },
              { value: "legible", label: "Legible" },
              { value: "mono", label: "Monospace" },
            ]}
          />
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Every screen is fluid and mobile-first: type scales with the device
          width and with your size preference, so it always fits — from 320px
          phones to desktop. Choices persist on this device.
        </p>
      </SectionCard>

      {/* Accessibility */}
      <SectionCard title="Accessibility" icon={Type} badge="Adaptive">
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
        <p className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs leading-4 text-brand-800">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-600" />
          PayPal sandbox becomes live as soon as client keys are set; everything else stays
          deterministic so judges can run the demo with zero configuration.
        </p>
      </SectionCard>
    </div>
  );
}

/** Compact segmented control used by the Appearance settings. */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: LucideIcon }[];
}) {
  return (
    <div
      role="radiogroup"
      className={`grid gap-1.5 ${
        options.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
      }`}
    >
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition-all ${
              active
                ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs"
                : "border-border bg-surface text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {Icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" /> : null}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
