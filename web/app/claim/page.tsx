"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  Eye,
  Loader2,
  Percent,
  Search,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { InfoRow, PageHeader, SectionCard } from "@/components/ui/section-card";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf } from "../fx";
import { loadSession, type Session } from "../session";

const STEPS = [
  {
    title: "Open your claim session",
    detail: "Paste the claim link or escrow ID your sender shared with you — no account setup needed beyond your session.",
  },
  {
    title: "Verify the transfer details",
    detail: "Amount, purpose tag and payout value are shown up front so you know exactly what you are claiming.",
  },
  {
    title: "Pick your mobile money provider",
    detail: "Choose MTN Mobile Money or Orange Money and enter the registered phone number that should receive the LRD payout.",
  },
  {
    title: "Upload the bill photo (proof)",
    detail: "A clear photo of the bill, invoice or receipt that matches the transfer purpose — this is what unlocks the payout.",
  },
  {
    title: "AI verdict, then instant payout",
    detail: "Vision AI returns PASS or FAIL with a reason in seconds. PASS releases mobile money immediately; FAIL keeps funds held with guidance.",
  },
];

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
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 aria-hidden="true" className="size-7 text-brand-600 motion-safe:animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying receiver session…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      <PageHeader
        icon={Download}
        title="Claim a transfer"
        subtitle={`Proof before payout — upload the bill, pass the AI check, receive mobile money. Signed in as ${session?.email || "receiver"}.`}
      />

      {/* Open claim */}
      <SectionCard title="Open your claim session" icon={Zap} badge="Zero login for senders">
        <form onSubmit={handleClaimProceed} className="flex flex-col gap-3">
          <label htmlFor="escrow-id" className="text-xs font-bold text-foreground">
            Escrow session ID or claim link
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="escrow-id"
              value={escrowInput}
              onChange={(e) => setEscrowInput(e.target.value)}
              placeholder="e.g. EZR-8F32A1 or paste the full link…"
              className="input pl-10 font-mono text-sm"
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Example ID:{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">EZR-982F1B</code>{" "}
            — the full link looks like <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">…/claim/EZR-982F1B</code>
          </p>
          <button type="submit" className="btn btn-primary gap-2 self-start">
            <ArrowRight aria-hidden="true" className="size-4" />
            Continue to claim session
          </button>
        </form>
      </SectionCard>

      {/* How it works */}
      <SectionCard title="How claiming works" icon={Eye} badge="5 steps">
        <ol className="flex flex-col gap-2.5 text-xs leading-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">
                {i + 1}
              </span>
              <span>
                <strong className="block text-sm font-bold text-foreground">{s.title}</strong>
                <span className="text-muted-foreground">{s.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* Proof rules */}
      <SectionCard title="Proof before payout — the rules" icon={ShieldCheck} badge="Strict">
        <div className="flex flex-col gap-2 text-xs leading-5 text-foreground">
          <p>
            <strong>The bill photo must match the purpose.</strong>{" "}
            <span className="text-muted-foreground">
              School transfers need school/tuition/fees paperwork, health transfers need
              clinic/hospital/pharmacy bills, rent needs a rent receipt, and so on.
            </span>
          </p>
          <p>
            <strong>Photos must be legible.</strong>{" "}
            <span className="text-muted-foreground">
              Empty or smaller-than-5KB files are rejected as blurry — retake close to the bill.
            </span>
          </p>
          <p>
            <strong>PASS or FAIL, never a maybe.</strong>{" "}
            <span className="text-muted-foreground">
              The verdict and its exact reason appear on your claim screen instantly. On FAIL the
              funds stay safely held and you can re-upload.
            </span>
          </p>
          <p>
            <strong>Unclaimed funds auto-refund.</strong>{" "}
            <span className="text-muted-foreground">
              If no passing proof arrives in time, the escrow returns the full charge — including
              the sender&apos;s fee — to the sender&apos;s PayPal.
            </span>
          </p>
        </div>
      </SectionCard>

      {/* Payout providers */}
      <SectionCard title="Payout providers" icon={Smartphone} badge="Mobile money">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50/60 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-xs font-extrabold text-amber-950">
              MTN
            </span>
            <div className="text-xs leading-5">
              <p className="text-sm font-bold text-foreground">MTN Mobile Money</p>
              <p className="text-muted-foreground">
                LRD payout to a registered MTN number. Reference starts <code className="font-mono">MOCK-MOMO-</code> in demo mode.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-orange-300 bg-orange-50/60 p-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-xs font-extrabold text-orange-950">
              MNY
            </span>
            <div className="text-xs leading-5">
              <p className="text-sm font-bold text-foreground">Orange Money</p>
              <p className="text-muted-foreground">
                LRD payout to a registered Orange number, same instant release on PASS.
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Live FX rate" value={`1 USD = ${USD_LRD} LRD`} mono highlight />
          <InfoRow label="Payout currency" value="LRD (Liberian Dollar)" mono />
        </div>
      </SectionCard>

      {/* Fees & safety */}
      <SectionCard title="Fees & safety" icon={Percent} badge={`${FEE_PCT_LABEL}% — paid by sender`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            label="Your payout"
            value={`Full amount · $60 = ${lrdOf(60).toLocaleString()} LRD`}
            mono
            highlight
          />
          <InfoRow
            label="Service fee"
            value={`${FEE_PCT_LABEL}% · paid by the sender ($${feeOf(60).toFixed(2)} on $60)`}
            mono
          />
          <InfoRow label="Escrow holder" value="PayPal (sandbox in demo)" mono />
          <InfoRow label="Auto-refund window" value="48 hours (production)" mono />
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs leading-4 text-brand-800">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
          <span>
            Your claim link is the only credential for this transfer — never share it publicly. The
            sender can see the claim status but never your mobile money PIN, and Ezri staff will
            never ask for one.
          </span>
        </div>
      </SectionCard>
    </div>
  );
}
