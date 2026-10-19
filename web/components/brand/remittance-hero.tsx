"use client";

import { Bot, CheckCircle2, Clock, CreditCard, Download, Lock, MessageSquare, ShieldCheck, Sparkles, Zap } from "lucide-react";
import Link from "next/link";

export function RemittanceHero() {
  return (
    <section className="w-full flex flex-col gap-6 rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
      {/* Top Value Pill Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
          <ShieldCheck className="size-3.5 text-brand-600" /> Proof before payout
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
          <Lock className="size-3.5 text-brand-600" /> PayPal sandbox escrow
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
          <CheckCircle2 className="size-3.5 text-brand-600" /> Built for Africa
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
          <Sparkles className="size-3.5 text-brand-600" /> Audited access
        </span>
      </div>

      {/* Hero Title & Subheadline */}
      <div className="flex flex-col gap-2 max-w-3xl">
        <span className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
          Ezri Africa · Purpose-Locked P2P Remittance
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-annita-navy-900 leading-tight">
          One secure place for your remittance life.
        </h1>
        <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
          Send money home for school, food, health &amp; emergency — purpose-locked with strict photo proof and mobile money disburse.
        </p>
      </div>

      {/* 4 Feature Cards Grid - 2 columns on tablet, 4 columns on desktop with gap-5 spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-2 border-t border-border">
        {/* Card 1 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 transition-all hover:border-brand-300 hover:bg-brand-50/40">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
            <MessageSquare className="size-5" />
          </div>
          <h2 className="text-sm font-extrabold text-foreground">Chat, lock, prove</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Type or speak your send in plain words — purpose-locked automatically.
          </p>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 transition-all hover:border-brand-300 hover:bg-brand-50/40">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
            <Lock className="size-5" />
          </div>
          <h2 className="text-sm font-extrabold text-foreground">PayPal sandbox escrow</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Money stays held until the receiver uploads verified photo proof.
          </p>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 transition-all hover:border-brand-300 hover:bg-brand-50/40">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
            <Download className="size-5" />
          </div>
          <h2 className="text-sm font-extrabold text-foreground">Claim link, zero login</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Receivers get a simple link to upload an invoice and get mobile money.
          </p>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/40 p-4 transition-all hover:border-brand-300 hover:bg-brand-50/40">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-200 text-brand-700">
            <Clock className="size-5" />
          </div>
          <h2 className="text-sm font-extrabold text-foreground">Offline queue &amp; AI check</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Draft transfers offline, auto-send when online, verified by strict AI.
          </p>
        </div>
      </div>
    </section>
  );
}
