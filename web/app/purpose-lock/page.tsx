"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Banknote,
  Camera,
  Check,
  Clock,
  Fingerprint,
  Globe,
  GraduationCap,
  HeartPulse,
  Home,
  KeyRound,
  Loader2,
  Lock,
  Percent,
  RotateCw,
  Save,
  ShieldCheck,
  Siren,
  Target,
  User,
  Volume2,
  VolumeX,
  Wheat,
  X,
} from "lucide-react";
import { InfoRow, PageHeader, SectionCard, Toggle } from "@/components/ui/section-card";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf } from "../fx";
import { authHeaders, loadSession, saveSession, type Session } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const SPEECH_KEY = "ezri:speech_enabled";
const PREFS_KEY = "ezri:purpose-lock";

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
    proof: [],
  },
] as const;

const EXPIRY_OPTIONS = [
  { value: "10", label: "10 minutes (testing / quick clock)", detail: "Short testing window for auto-refund verification." },
  { value: "120", label: "2 hours", detail: "Short window for same-day market and food claims." },
  { value: "1440", label: "24 hours", detail: "Standard window for hospital and school office hours." },
  { value: "2880", label: "48 hours (production policy default)", detail: "Production policy: unclaimed escrow auto-refunds to the sender after 48h." },
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

type PurposeLockPayload = {
  active_tag?: string;
  strict_proof?: boolean;
  require_photo?: boolean;
  auto_refund?: boolean;
  speech_enabled?: boolean;
  expiry_minutes?: number;
  requireApproval?: boolean;
  requirePin?: boolean;
  refundApproval?: boolean;
  profile?: { name: string; phone: string; avatar: string | null };
};

export default function PurposeLockPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // User Profile State
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("+231 088 123 4567");
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  // Purpose Lock State
  const [activeTag, setActiveTag] = useState("SCHOOL");
  const [strictProof, setStrictProof] = useState(true);
  const [requirePhoto, setRequirePhoto] = useState(true);
  const [autoRefund, setAutoRefund] = useState(true);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [expiry, setExpiry] = useState("10");
  const [approval, setApproval] = useState<ApprovalPrefs>(APPROVAL_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    function applyPayload(p: Partial<PurposeLockPayload>) {
      setApproval({
        requireApproval:
          typeof p.requireApproval === "boolean" ? p.requireApproval : APPROVAL_DEFAULTS.requireApproval,
        requirePin: typeof p.requirePin === "boolean" ? p.requirePin : APPROVAL_DEFAULTS.requirePin,
        refundApproval:
          typeof p.refundApproval === "boolean" ? p.refundApproval : APPROVAL_DEFAULTS.refundApproval,
      });
      if (typeof p.active_tag === "string") setActiveTag(p.active_tag);
      if (typeof p.strict_proof === "boolean") setStrictProof(p.strict_proof);
      if (typeof p.require_photo === "boolean") setRequirePhoto(p.require_photo);
      if (typeof p.auto_refund === "boolean") setAutoRefund(p.auto_refund);
      if (typeof p.speech_enabled === "boolean") setSpeechEnabled(p.speech_enabled);
      if (typeof p.expiry_minutes === "number") setExpiry(String(p.expiry_minutes));
      if (p.profile) {
        if (p.profile.avatar) setProfileAvatar(p.profile.avatar);
        if (p.profile.phone) setProfilePhone(p.profile.phone);
        if (p.profile.name) setProfileName(p.profile.name);
      }
    }

    void (async () => {
      const s = await loadSession().catch(() => null);
      if (!alive) return;
      if (!s) {
        router.replace("/login?next=/purpose-lock");
        return;
      }
      setSession(s);
      setProfileName(s.name || "Sender");
      setProfileEmail(s.email || "you@example.com");

      try {
        const stored = localStorage.getItem(PREFS_KEY);
        if (stored) {
          applyPayload(JSON.parse(stored));
        }
        const spStored = localStorage.getItem(SPEECH_KEY);
        if (spStored === "true") setSpeechEnabled(true);
      } catch {}

      try {
        const res = await fetch(`${API}/api/user/prefs`, {
          headers: authHeaders(s.token),
        });
        if (res.ok) {
          const remote = (await res.json()) as PurposeLockPayload;
          applyPayload(remote);
          try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(remote));
          } catch {}
        }
      } catch {}

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  function handleAvatarUpload(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setProfileAvatar(result);
    };
    reader.readAsDataURL(file);
  }

  function setApprovalPref<K extends keyof ApprovalPrefs>(key: K, value: ApprovalPrefs[K]) {
    setApproval((prev) => ({ ...prev, [key]: value }));
  }

  function handleSpeechToggle(val: boolean) {
    setSpeechEnabled(val);
    try {
      localStorage.setItem(SPEECH_KEY, String(val));
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const payload: PurposeLockPayload = {
      active_tag: activeTag,
      strict_proof: strictProof,
      require_photo: requirePhoto,
      auto_refund: autoRefund,
      speech_enabled: speechEnabled,
      expiry_minutes: Number(expiry),
      ...approval,
      profile: {
        name: profileName,
        phone: profilePhone,
        avatar: profileAvatar,
      },
    };

    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(payload));
      localStorage.setItem(SPEECH_KEY, String(speechEnabled));
    } catch {}

    if (session?.token) {
      try {
        const res = await fetch(`${API}/api/user/prefs`, {
          method: "POST",
          headers: authHeaders(session.token),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setSaveError("Saved locally. Could not sync with server.");
        }
      } catch {
        setSaveError("Saved locally (offline).");
      }
    }

    if (session) {
      await saveSession({
        ...session,
        name: profileName,
        email: profileEmail,
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 aria-hidden="true" className="size-7 text-brand-600 motion-safe:animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Profile &amp; Settings…</p>
      </div>
    );
  }

  const active = TAGS.find((t) => t.id === activeTag) || TAGS[0];
  const ActiveIcon = active.icon;
  const expiryOption = EXPIRY_OPTIONS.find((o) => o.value === expiry) || EXPIRY_OPTIONS[0];

  return (
    <div className="flex flex-col gap-6 pb-6 w-full min-w-0">
      <PageHeader
        icon={Target}
        title="Settings &amp; Purpose Lock Configuration"
        subtitle={`Manage your account profile, avatar, purpose locks, and AI safety preferences.`}
      />

      {/* User Profile & Avatar Card */}
      <SectionCard title="User Profile &amp; Avatar" icon={User} badge="Account Info">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative group shrink-0">
            <div className="flex size-20 items-center justify-center rounded-3xl border-2 border-brand-300 bg-brand-50 text-brand-700 font-extrabold text-2xl overflow-hidden shadow-sm">
              {profileAvatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profileAvatar} alt="Profile Avatar" className="size-full object-cover" />
              ) : (
                profileName.charAt(0).toUpperCase()
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md cursor-pointer hover:bg-brand-700 transition"
              title="Upload Profile Picture"
            >
              <Camera className="size-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleAvatarUpload(e.target.files?.[0] || null)}
                className="sr-only"
              />
            </label>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pname" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Full Name
              </label>
              <input
                id="pname"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="input text-sm font-semibold"
                placeholder="John Doe"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pemail" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account Email
              </label>
              <input
                id="pemail"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="input text-sm font-semibold"
                placeholder="you@example.com"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Purpose category */}
      <SectionCard title="Purpose Category Tag" icon={Target} badge="Enforced by AI">
        <p className="text-xs leading-5 text-muted-foreground">
          Select the default tag applied when you send money through Ezri AI. You can still tap a
          different tag on any transfer before approving it.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {TAGS.map((t) => {
            const Icon = t.icon;
            const selected = activeTag === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTag(t.id)}
                aria-pressed={selected}
                className={`flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
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
                <div className="min-w-0 flex-1 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-foreground">{t.label}</span>
                    {selected && <Check aria-hidden="true" className="size-4 shrink-0 text-brand-700" />}
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
        </div>
      </SectionCard>

      {/* Voice Read-Back Approval Settings */}
      <SectionCard title="Voice &amp; Speech Settings" icon={Volume2} badge={speechEnabled ? "Voice Approved" : "Muted by Default"}>
        <Toggle
          checked={speechEnabled}
          onChange={handleSpeechToggle}
          icon={speechEnabled ? Volume2 : VolumeX}
          label="Approve AI Voice Read-Back (Text-to-Speech)"
          hint="By default, AI voice speech is disabled so the AI does not speak by itself. Turn this ON if you want AI to read responses out loud."
        />
        <InfoRow
          label="Default Voice Policy"
          value={speechEnabled ? "Voice Read-Back APPROVED" : "MUTED — Text Only (Requires Approval)"}
          highlight={speechEnabled}
          mono
        />
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
      </SectionCard>

      {/* Auto-refund & expiry */}
      <SectionCard title="Escrow expiry &amp; auto-refund" icon={Clock} badge="Sender protected">
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
          <p className="text-xs leading-4 text-muted-foreground">{expiryOption.detail}</p>
        </div>
        <Toggle
          checked={autoRefund}
          onChange={setAutoRefund}
          icon={RotateCw}
          label="Auto-refund unclaimed funds"
          hint="When the window closes without passing proof, the full charge returns to the sender's PayPal."
        />
      </SectionCard>

      {/* Fees & limits */}
      <SectionCard title="Fees &amp; limits" icon={Percent} badge={`${FEE_PCT_LABEL}% per transaction`}>
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
      </SectionCard>

      {/* Approval policy */}
      <SectionCard title="Approval policy" icon={Fingerprint} badge="Keeps you in the loop">
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
          label="Ask before refunds &amp; sender overrides"
          hint="Ledger refunds and AI-fail overrides come back to you first."
        />
        <InfoRow label="Money PIN" value="Your 4-digit Money PIN" mono highlight />
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
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        {saveError ? (
          <p className="text-xs font-semibold text-amber-700">{saveError}</p>
        ) : null}
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
            {saved ? "Settings saved" : "Save configuration & preferences"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
