"use client";

import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

/** Page title block — same treatment on Settings, Purpose Lock and Claim pages. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon = Sparkles,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="flex items-center gap-2 text-xl font-extrabold text-foreground sm:text-2xl">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-600" />
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** Standard section card used across app settings surfaces. */
export function SectionCard({
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

/** Accessible switch row used in settings-style sections. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
  icon: Icon,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  icon: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
        checked
          ? "border-brand-300 bg-brand-50/60"
          : "border-border bg-surface hover:bg-muted"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
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

/** Simple label/value info row used inside section cards. */
export function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs">
      <span className="font-bold text-foreground">{label}</span>
      <span
        className={`font-extrabold ${mono ? "font-mono" : ""} ${
          highlight ? "text-brand-700" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
