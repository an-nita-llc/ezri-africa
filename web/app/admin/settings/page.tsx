"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Clock,
  KeyRound,
  Loader2,
  Percent,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { InfoRow, PageHeader, SectionCard, Toggle } from "@/components/ui/section-card";
import { loadSession, type Session } from "../../session";

export default function AdminSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [feePct, setFeePct] = useState("2.0");
  const [demoExpiry, setDemoExpiry] = useState("10");
  const [openRouterModel, setOpenRouterModel] = useState("deepseek/deepseek-chat");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s || s.role !== "ADMIN") {
        router.replace("/login?next=/admin/settings");
        return;
      }
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  async function handleSaveConfig() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening Platform Configuration…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Platform Configuration &amp; Security
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              <ShieldCheck className="size-3.5" /> Root Controls
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure platform fees, OpenRouter intent models, escrow expiry clocks, and security policies.
          </p>
        </div>

        <Link href="/admin" className="btn btn-secondary btn-sm font-bold">
          ← Back to Admin
        </Link>
      </div>

      <SectionCard title="Ezri Service Fee Percentage" icon={Percent} badge="Single Source of Truth">
        <div className="flex flex-col gap-2">
          <label htmlFor="feepct" className="text-xs font-bold text-foreground">
            Platform Fee Percentage (%)
          </label>
          <input
            id="feepct"
            value={feePct}
            onChange={(e) => setFeePct(e.target.value)}
            className="input text-sm font-mono font-bold max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Default platform fee charged on transfers (2.0% = $1.20 on $60.00 transfer).
          </p>
        </div>
      </SectionCard>

      <SectionCard title="OpenRouter LLM Intent Engine" icon={Sparkles} badge="Intent parsing">
        <div className="flex flex-col gap-2">
          <label htmlFor="aimodel" className="text-xs font-bold text-foreground">
            Selected OpenRouter Model
          </label>
          <select
            id="aimodel"
            value={openRouterModel}
            onChange={(e) => setOpenRouterModel(e.target.value)}
            className="input text-sm font-mono max-w-md"
          >
            <option value="deepseek/deepseek-chat">DeepSeek V4 / Flash (deepseek/deepseek-chat)</option>
            <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B Instruct</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Intent parsing uses OpenRouter. Receipt proof stays deterministic in the live API and is not model-dependent.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Demo Expiry Window" icon={Clock} badge="Auto-Refund Clock">
        <div className="flex flex-col gap-2">
          <label htmlFor="exp" className="text-xs font-bold text-foreground">
            Default Claim Expiry Minutes
          </label>
          <input
            id="exp"
            value={demoExpiry}
            onChange={(e) => setDemoExpiry(e.target.value)}
            className="input text-sm font-mono font-bold max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            10 minutes for demo walkthroughs (stands for 48 hours in production). Unclaimed escrows automatically refund to sender.
          </p>
        </div>
      </SectionCard>

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void handleSaveConfig()}
          disabled={saving}
          className="btn btn-primary btn-lg gap-2 shadow-md"
        >
          {saving ? (
            <Loader2 className="size-5 animate-spin" />
          ) : saved ? (
            <Check className="size-5" />
          ) : (
            <Save className="size-5" />
          )}
          {saved ? "System Configuration Saved!" : "Save Platform Configuration"}
        </button>
      </div>
    </div>
  );
}
