"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { authHeaders, loadSession, type Session } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TAGS = [
  { id: "SCHOOL", label: "School", icon: "🎓", desc: "Tuition, school fees, books & uniforms" },
  { id: "FOOD", label: "Food & Grocery", icon: "🌾", desc: "Food supplies, markets & household groceries" },
  { id: "HEALTH", label: "Healthcare", icon: "🏥", desc: "Hospital bills, prescriptions & clinic receipts" },
  { id: "RENT", label: "Rent & Housing", icon: "🏠", desc: "Monthly rent payments & property leases" },
  { id: "EMERGENCY", label: "Emergency", icon: "🚨", desc: "Urgent disaster relief & unexpected care" },
  { id: "GENERAL", label: "General", icon: "💵", desc: "Unrestricted purpose lock with photo receipt" },
] as const;

export default function PurposeLockPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("SCHOOL");
  const [strictProof, setStrictProof] = useState(true);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace("/login");
        return;
      }
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm font-medium text-muted-foreground">Loading Purpose Lock Settings…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-700">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-annita-navy-900">
                Purpose Lock Configuration
              </h1>
              <p className="text-xs font-semibold text-muted-foreground">
                Managed by {session?.name || "Sender"}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-annita-green/15 px-3 py-1 text-xs font-bold text-annita-green-dark border border-annita-green/30">
            <span className="size-2 rounded-full bg-annita-green animate-pulse" />
            Escrow Active
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Funds remain strictly locked until receiver provides verified photo proof.
        </p>
      </div>

      {/* Purpose Category Tag Selection Grid */}
      <section className="card flex flex-col gap-5">
        <div>
          <h2 className="text-base font-bold text-foreground">Purpose Category Tag</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the active tag rule applied when sending money via Ezri AI.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TAGS.map((t) => {
            const selected = activeTag === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTag(t.id)}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                  selected
                    ? "border-brand-600 bg-brand-50/80 ring-2 ring-brand-500/20 shadow-xs"
                    : "border-border bg-surface hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{t.label}</span>
                    {selected && <Check className="size-4 text-brand-700" />}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground leading-snug">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Verification Rules Card */}
      <section className="card flex flex-col gap-5">
        <div>
          <h2 className="text-base font-bold text-foreground">Escrow Verification Rules</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure automatic AI proof requirements and refund schedules.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/30 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={strictProof}
              onChange={(e) => setStrictProof(e.target.checked)}
              className="size-5 accent-brand-600 mt-0.5"
            />
            <div>
              <span className="text-sm font-bold text-foreground block">Strict Vision AI Receipt Check</span>
              <span className="text-xs text-muted-foreground block mt-0.5">
                AI inspects bill photo for date, merchant, amount, and tag context match before releasing mobile money.
              </span>
            </div>
          </label>

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Clock className="size-4 text-brand-600" /> Auto-Refund Timer
              </span>
              <span className="text-xs font-mono font-bold text-brand-700">{expiryMinutes} minutes (Demo Mode)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Unclaimed funds without photo proof automatically trigger a PayPal refund back to your account.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="btn btn-primary btn-lg w-full sm:w-auto self-end gap-2"
        >
          {saved ? <Check className="size-4" /> : <ShieldCheck className="size-4" />}
          {saved ? "Settings Saved!" : "Save Purpose Lock Configuration"}
        </button>
      </section>
    </div>
  );
}
