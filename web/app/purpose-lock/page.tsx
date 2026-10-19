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
import { loadSession, saveSession, type Session } from "../session";

const SPEECH_KEY = "ezri:speech_enabled";
const PROFILE_KEY = "ezri:user_profile";

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

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace("/login?next=/purpose-lock");
        return;
      }
      setSession(s);
      setProfileName(s.name || "Demo Sender");
      setProfileEmail(s.email || "demo@ezri.africa");

      try {
        const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") as Partial<ApprovalPrefs>;
        setApproval({ ...APPROVAL_DEFAULTS, ...stored });
        const spStored = localStorage.getItem(SPEECH_KEY);
        if (spStored === "true") setSpeechEnabled(true);

        const profStored = JSON.parse(localStorage.getItem(PROFILE_KEY) || "{}");
        if (profStored.avatar) setProfileAvatar(profStored.avatar);
        if (profStored.phone) setProfilePhone(profStored.phone);
      } catch {}
      setLoading(false);
    });
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
    setApproval((prev) => {
      const next = { ...prev, [key]: value };
      try {
        const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
        localStorage.setItem(PREFS_KEY, JSON.stringify({ ...stored, ...next }));
      } catch {}
      return next;
    });
  }

  function handleSpeechToggle(val: boolean) {
    setSpeechEnabled(val);
    try {
      localStorage.setItem(SPEECH_KEY, String(val));
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    try {
      localStorage.setItem(
        "ezri:purpose-lock",
        JSON.stringify({
          active_tag: activeTag,
          strict_proof: strictProof,
          require_photo: requirePhoto,
          auto_refund: autoRefund,
          speech_enabled: speechEnabled,
          expiry_minutes: Number(expiry),
          ...approval,
        }),
      );
      localStorage.setItem(SPEECH_KEY, String(speechEnabled));

      const updatedProfile = {
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        avatar: profileAvatar,
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));

      if (session) {
        await saveSession({
          ...session,
          name: profileName,
          email: profileEmail,
        });
      }
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
                type="email"
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

      {/* Save Settings Action Button */}
      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="btn btn-primary btn-lg gap-2 shadow-md"
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />
          ) : saved ? (
            <Check aria-hidden="true" className="size-5" />
          ) : (
            <Save aria-hidden="true" className="size-5" />
          )}
          {saved ? "Profile & Settings Saved!" : "Save Profile & Configuration"}
        </button>
      </div>
    </div>
  );
}
