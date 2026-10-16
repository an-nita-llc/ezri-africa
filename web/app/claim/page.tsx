"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Lock, Search, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { loadSession, type Session } from "../session";

export default function ClaimHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [escrowInput, setEscrowInput] = useState("");

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace("/login?next=/claim");
        return;
      }
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  function handleClaimProceed(e: React.FormEvent) {
    e.preventDefault();
    if (!escrowInput.trim()) return;

    let cleanId = escrowInput.trim();
    if (cleanId.includes("/claim/")) {
      cleanId = cleanId.split("/claim/").pop()?.split("?")[0] || cleanId;
    }
    router.push(`/claim/${cleanId}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying Receiver Session…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6 py-4">
      {/* Banner */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-700">
              <Download className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-annita-navy-900">Claim Remittance Payout</h1>
              <p className="text-xs text-muted-foreground font-semibold">Receiver Account: {session?.email}</p>
            </div>
          </div>

          <span className="rounded-full bg-annita-green/15 px-3 py-1 text-xs font-bold text-annita-green-dark border border-annita-green/30">
            Authenticated
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter or paste your Escrow Session ID or claim link provided by your sender to upload proof and disburse Mobile Money.
        </p>
      </div>

      {/* Enter Claim ID Form */}
      <form onSubmit={handleClaimProceed} className="card flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="escrow-id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Escrow Session ID or Claim Link
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="escrow-id"
              value={escrowInput}
              onChange={(e) => setEscrowInput(e.target.value)}
              placeholder="e.g. ESC-8F32A1 or paste link..."
              className="input pl-10 font-mono text-sm"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Example: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">ESC-982F1B</code>
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full gap-2 text-base font-bold shadow-md"
        >
          <Zap className="size-5" />
          Continue to Claim Session
        </button>
      </form>

      {/* Info Card */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 flex items-start gap-3">
        <ShieldCheck className="size-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-bold text-foreground block">Proof Before Payout Security Rule</span>
          Money remains safely held in PayPal sandbox escrow until you upload your invoice/receipt photo and select your Orange Money or MTN Mobile Money account.
        </div>
      </div>
    </div>
  );
}
