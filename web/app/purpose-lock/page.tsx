"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Check,
  Clock,
  Fingerprint,
  GraduationCap,
  HeartPulse,
  Home,
  KeyRound,
  Loader2,
  Percent,
  RotateCw,
  Save,
  ShieldCheck,
  Siren,
  Target,
  Wheat,
} from "lucide-react";
import { InfoRow, PageHeader, SectionCard, Toggle } from "@/components/ui/section-card";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf } from "../fx";
import { loadSession, type Session } from "../session";

const TAGS = [
  {
    id: "SCHOOL",
    label: "School",
    icon: GraduationCap,
    desc: "Tuition, school fees, books & uniforms",
    example: "Send $60 to mom for school",
    proof: ["school", "tuition", "fees", "semester", "student", "invoice", "bill"],
  },
  {
    id: "FOOD",
    label: "Food & Grocery",
    icon: Wheat,
    desc: "Food supplies, markets & household groceries",
    example: "Send $45 for grocery food",
    proof: ["rice", "market", "food", "shop", "store", "receipt", "invoice", "bill"],
  },
  {
    id: "HEALTH",
    label: "Healthcare",
    icon: HeartPulse,
    desc: "Hospital bills, prescriptions & clinic receipts",
    example: "Send $120 for hospital bill",
    proof: ["clinic", "hospital", "pharmacy", "drug", "bill", "receipt"],
  },
  {
    id: "RENT",
    label: "Rent & Housing",
    icon: Home,
    desc: "Monthly rent payments & property leases",
    example: "Send $200 for rent",
    proof: ["rent", "landlord", "house", "apartment", "receipt"],
  },
  {
    id: "EMERGENCY",
    label: "Emergency",
    icon: Siren,
    desc: "Urgent disaster relief & unexpected care",
    example: "Send $80 for emergency clinic bill",
    proof: ["hospital", "clinic", "bill", "receipt", "invoice"],
  },
  {
    id: "GENERAL",
    label: "General",
    icon: Banknote,
    desc: "Unrestricted purpose lock with photo receipt",
    example: "Send $30 general",
    proof: [], // any receipt or claim confirmation passes
  },
] as const;

const EXPIRY_OPTIONS = [
  { value: "10", label: "10 minutes (demo mode)", detail: "Used for the hackathon walkthrough — keeps the auto-refund visible on stage." },
  { value: "120", label: "2 hours", detail: "Short window for same-day market and food claims." },
  { value: "1440", label: "24 hours", detail: "Standard window for hospital and school office hours." },
  { value: "2880", label: "48 hours (production default)", detail: "Production policy: unclaimed escrow auto-refunds to the sender after 48h." },
];

type ApprovalPrefs = {
  requireApproval: boolean;
  requirePin: boolean;
  refundApproval: boolean;
};

const APPROVAL_DEFAULTS: ApprovalPrefs = {
  requireApproval: true,
  requirePin: true,
  refundApproval: true,
};

const PREFS_KEY = "ezri:prefs";

export default function PurposeLockPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeTag, setActiveTag] = useState("SCHOOL");
  const [strictProof, setStrictProof] = useState(true);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [autoRefund, setAutoRefund] = useState(true);
  const [expiry, setExpiry] = useState("10");
  const [approval, setApproval] = useState<ApprovalPrefs>(APPROVAL_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace("/login?next=/purpose-lock");
        return;
      }
      setSession(s);
      try {
        const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<ApprovalPrefs>;
        setApproval({ ...APPROVAL_DEFAULTS, ...stored });
      } catch {}
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  function setApprovalPref<K extends keyof ApprovalPrefs>(key: K, value: ApprovalPrefs[K]) {
    setApproval((prev) => {
      const next = { ...prev, [key]: value };
      try {
        const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
        localStorage.setItem(PREFS_KEY, JSON.stringify({ ...stored, ...next }));
      } catch {}
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    // Persist the full configuration locally (same store App settings uses).
    try {
      localStorage.setItem(
        "ezri:purpose-lock",
        JSON.stringify({
          active_tag: activeTag,
          strict_proof: strictProof,
          require_photo: requirePhoto,
          auto_refund: autoRefund,
          expiry_minutes: Number(expiry),
          ...approval,
        }),
      );
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 aria-hidden="true" className="size-7 text-brand-600 motion-safe:animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Purpose Lock settings…</p>
      </div>
    );
  }

  const active = TAGS.find((t) => t.id === activeTag) || TAGS[0];
  const ActiveIcon = active.icon;
  const expiryOption = EXPIRY_OPTIONS.find((o) => o.value === expiry) || EXPIRY_OPTIONS[0];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <PageHeader
        icon={Target}
        title="Purpose Lock configuration"
        subtitle={`Funds stay strictly locked to their stated purpose until verified photo proof passes the AI check. Managed by ${session?.name || "Sender"}.`}
      />

      {/* Purpose category */}
      <SectionCard title="Purpose category tag" icon={Target} badge="Enforced by AI">
        <p className="text-xs leading-5 text-muted-foreground">
          Select the default tag applied when you send money through Ezri AI. You can still tap a
          different tag on any transfer before approving it.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TAGS.map((t) => {
            const Icon = t.icon;
            const selected = activeTag === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTag(t.id)}
                aria-pressed={selected}
                className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                  selected
                    ? "border-brand-600 bg-brand-50/80 ring-2 ring-brand-500/20 shadow-xs"
                    : "border-border bg-surface hover:bg-muted"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    selected ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">{t.label}</span>
                    {selected ? (
                      <Check aria-hidden="true" className="size-4 shrink-0 text-brand-700" />
                    ) : (
                      <span className="rounded-full border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {t.id}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">{t.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active tag detail */}
        <div className="flex flex-col gap-2 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-sm font-extrabold text-brand-800">
              <ActiveIcon aria-hidden="true" className="size-4" /> Active lock: {active.id}
            </span>
            <span className="rounded-full border border-brand-300 bg-brand-100 px-2.5 py-0.5 font-extrabold text-brand-900">
              {active.id === "GENERAL" ? "Loose check" : "Strict match"}
            </span>
          </div>
          <p className="leading-5 text-brand-900/80">
            <strong>Example command:</strong> “{active.example}”
          </p>
          <p className="leading-5 text-brand-900/80">
            <strong>Proof that passes:</strong>{" "}
            {active.id === "GENERAL"
              ? "any clear receipt or claim confirmation — no strict keyword match is required."
              : `the uploaded bill photo must reference ${active.proof.slice(0, -1).join(", ")} or ${active.proof[active.proof.length - 1]}.`}
          </p>
          <p className="leading-5 text-brand-900/80">
            <strong>On FAIL:</strong> payout stays held as NEEDS_RETRY with the AI&apos;s reason —
            the receiver re-uploads, or you approve an override with your PIN.
          </p>
        </div>
      </SectionCard>

      {/* Proof requirements */}
      <SectionCard title="Proof requirements" icon={ShieldCheck} badge="Prove first">
        <Toggle
          checked={strictProof}
          onChange={setStrictProof}
          icon={ShieldCheck}
          label="Strict Vision AI receipt check"
          hint="AI inspects the bill photo for purpose keywords, legibility and amount window before releasing mobile money."
        />
        <Toggle
          checked={requirePhoto}
          onChange={setRequirePhoto}
          icon={Target}
          label="Bill photo required before any release"
          hint="Prove-first is non-negotiable: no photo, no payout — funds stay in escrow."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Minimum photo size" value="5 KB (blurry/too small = FAIL)" mono />
          <InfoRow label="Verdict" value="Instant PASS / FAIL with reason" highlight />
        </div>
        <p className="text-[11px] leading-4 text-muted-foreground">
          The receiver sees the exact FAIL reason on the claim page, so retries are guided instead of
          silent. Production swaps the heuristic check for a Qwen vision model — the contract stays
          the same: strict PASS/FAIL + reason, never a maybe.
        </p>
      </SectionCard>

      {/* Auto-refund & expiry */}
      <SectionCard title="Escrow expiry & auto-refund" icon={Clock} badge="Sender protected">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="expiry" className="text-xs font-bold text-foreground">
            Claim window before auto-refund
          </label>
          <select
            id="expiry"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="input text-sm"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[11px] leading-4 text-muted-foreground">{expiryOption.detail}</p>
        </div>
        <Toggle
          checked={autoRefund}
          onChange={setAutoRefund}
          icon={RotateCw}
          label="Auto-refund unclaimed funds"
          hint="When the window closes without passing proof, the full charge (including the 2% fee) returns to the sender's PayPal."
        />
        <InfoRow
          label="Expired escrow status"
          value="EXPIRED → refunded automatically"
          mono
        />
      </SectionCard>

      {/* Fees & limits */}
      <SectionCard title="Fees & limits" icon={Percent} badge={`${FEE_PCT_LABEL}% per transaction`}>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            label={`Platform fee (${FEE_PCT_LABEL}%)`}
            value={`$60 → fee $${feeOf(60).toFixed(2)} · charged $${(60 + feeOf(60)).toFixed(2)}`}
            mono
            highlight
          />
          <InfoRow label="Receiver payout" value={`Unreduced · $60 = ${lrdOf(60).toLocaleString()} LRD`} mono />
          <InfoRow label="Minimum transfer" value="$1.00" mono />
          <InfoRow label="Maximum transfer" value="$2,000.00 per transaction" mono />
        </div>
        <InfoRow label="Live FX rate" value={`1 USD = ${USD_LRD} LRD (no hidden markup)`} mono highlight />
        <p className="text-[11px] leading-4 text-muted-foreground">
          The fee is added to the PayPal charge and shown in the approval card before you confirm —
          the agent never moves money without showing it. Refunds always return the full amount
          charged, fee included.
        </p>
      </SectionCard>

      {/* Approval policy — shared with App settings */}
      <SectionCard title="Approval policy" icon={Fingerprint} badge="Keeps you in the loop">
        <p className="text-xs leading-5 text-muted-foreground">
          These switches are shared with App settings — change them anywhere and the agent obeys
          them everywhere.
        </p>
        <Toggle
          checked={approval.requireApproval}
          onChange={(v) => setApprovalPref("requireApproval", v)}
          icon={Check}
          label="Approve every transfer before it runs"
          hint="The agent pauses with a summary card and waits for your explicit OK."
        />
        <Toggle
          checked={approval.requirePin}
          onChange={(v) => setApprovalPref("requirePin", v)}
          icon={KeyRound}
          label="Require 4-digit PIN to move money"
          hint="PIN entry happens in-chat before PayPal is touched."
        />
        <Toggle
          checked={approval.refundApproval}
          onChange={(v) => setApprovalPref("refundApproval", v)}
          icon={Fingerprint}
          label="Ask before refunds & sender overrides"
          hint="Ledger refunds and AI-fail overrides come back to you first."
        />
        <InfoRow label="Demo money PIN" value="1234" mono highlight />
      </SectionCard>

      {/* What happens on FAIL */}
      <SectionCard title="If the proof fails" icon={AlertTriangle} badge="Strict, not silent">
        <ol className="flex flex-col gap-2 text-xs leading-5 text-foreground">
          {[
            "The payout stays HELD — nothing is released on a maybe.",
            "Escrow moves to NEEDS_RETRY and the receiver sees the exact AI reason on the claim page.",
            "The receiver re-uploads a clearer, purpose-matching bill photo.",
            "You can approve a sender override from the Transfers Ledger (approval + PIN required).",
            autoRefund
              ? `If nothing passes within ${expiryOption.label.toLowerCase()}, the escrow auto-refunds in full.`
              : "Auto-refund is off — funds stay held until you refund manually from the ledger.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-extrabold text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="flex justify-end border-t border-border pt-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn btn-primary gap-2"
          >
            {saving ? (
              <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            ) : saved ? (
              <Check aria-hidden="true" className="size-4" />
            ) : (
              <Save aria-hidden="true" className="size-4" />
            )}
            {saved ? "Settings saved" : "Save Purpose Lock configuration"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
