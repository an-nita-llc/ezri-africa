"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Lock,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { loadSession, type Session } from "../../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDERS = [
  {
    id: "MTN",
    name: "MTN Mobile Money",
    color: "from-amber-400 to-yellow-500",
    textColor: "text-amber-950",
    borderColor: "border-amber-400",
    badge: "MTN MoMo",
  },
  {
    id: "ORANGE",
    name: "Orange Money",
    color: "from-orange-500 to-amber-600",
    textColor: "text-orange-950",
    borderColor: "border-orange-500",
    badge: "Orange Money",
  },
];

export default function ClaimPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id || "");

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [escrow, setEscrow] = useState<any>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("MTN");
  const [pnumber, setPnumber] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const loadEscrow = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/escrow/${id}`);
      if (!r.ok) {
        setError("This claim link was not found or has expired. Please ask the sender for a fresh link.");
        return;
      }
      setEscrow(await r.json());
      setFeedback("");
    } catch {
      setError("Unable to connect to the server. Please check your internet connection and reload.");
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace(`/login?next=/claim/${id}`);
        return;
      }
      setSession(s);
      setSessionLoading(false);
      void loadEscrow();
    });
    return () => {
      alive = false;
    };
  }, [id, router, loadEscrow]);

  function speak(text: string) {
    setFeedback(text);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      window.speechSynthesis?.speak(u);
    } catch {}
  }

  function handleFileChange(selectedFile: File | null) {
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      speak("Please upload a photo of your bill or invoice first. Proof is required before payout.");
      return;
    }
    if (!pnumber.trim()) {
      speak("Please enter your Mobile Money account phone number.");
      return;
    }

    setSubmitting(true);
    const fd = new FormData();
    fd.append("escrow_id", id);
    fd.append("provider", provider);
    fd.append("provider_number", pnumber.trim());
    fd.append("note", proofNote || "Claim Submission");
    fd.append("proof", file);

    try {
      const r = await fetch(`${API}/api/escrow/prove`, { method: "POST", body: fd });
      const j = await r.json();
      await loadEscrow();
      setSubmitting(false);

      if (j.verdict === "PASS") {
        speak(`Verification approved! Mobile money payout is on its way to your ${provider} account ${pnumber}.`);
      } else {
        speak(`Verification retry needed. ${j.reason || "Please provide a clearer bill photo."}`);
      }
    } catch {
      setSubmitting(false);
      speak("Claim submission encountered a network error. Please try again.");
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying Receiver Account…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div role="alert" className="rounded-3xl border border-danger/30 bg-danger/10 p-6 text-danger flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-6 shrink-0" />
            <h2 className="text-lg font-bold">Invalid Claim Link</h2>
          </div>
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Transfer Claim Session…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-2">
      {/* Remittance Summary Banner */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-700">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-annita-navy-900">Purpose-Locked Claim</h1>
              <p className="text-xs text-muted-foreground font-mono">Escrow Session: {escrow.id}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
            <ShieldCheck className="size-3.5" /> Logged In as {session?.name}
          </span>
        </div>

        {/* Transfer Value Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted/40 p-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Transfer Amount
            </span>
            <span className="text-2xl font-extrabold text-foreground">${escrow.amount_usd}.00 USD</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Mobile Money Payout
            </span>
            <span className="text-2xl font-extrabold text-brand-700">
              {(escrow.amount_usd * 192).toLocaleString()} LRD
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 font-bold text-brand-700 border border-brand-200">
            Tag: {escrow.tag}
          </span>
          <span className="text-muted-foreground">
            Note: {escrow.note || "Purpose-locked remittance"}
          </span>
        </div>
      </div>

      {/* Claim Status Handlers */}
      {escrow.status === "RELEASED" ? (
        /* PASS SUCCESS CARD */
        <div className="rounded-3xl border border-emerald-300 bg-emerald-50/80 p-6 text-emerald-950 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <BadgeCheck className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-emerald-950">Mobile Money Payout Disbursed</h2>
              <p className="text-xs font-semibold text-emerald-800">Verified by Vision AI Engine</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 p-4 border border-emerald-200/80 text-xs flex flex-col gap-2 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Provider:</span>
              <span className="font-bold">{escrow.provider} Mobile Money</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Account Phone:</span>
              <span className="font-bold">{escrow.provider_number}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-200 pt-2">
              <span className="text-muted-foreground font-sans">MoMo Txn Ref ID:</span>
              <span className="font-bold text-emerald-700">{escrow.mock_momo_txn_id}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-800/90 leading-relaxed">
            Funds have been transferred directly to your mobile money account. Keep this receipt reference for your records.
          </p>
        </div>
      ) : escrow.status === "REFUNDED" || escrow.status === "EXPIRED" ? (
        /* CLOSED STATE */
        <div className="rounded-3xl border border-border bg-muted/30 p-6 text-center flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Clock className="size-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">This Claim Session is Closed ({escrow.status})</h2>
          <p className="text-xs text-muted-foreground max-w-md">
            This transfer link has either expired or been refunded by the sender. Please contact the sender for a fresh link.
          </p>
        </div>
      ) : (
        /* STEP-BY-STEP CLAIM FORM */
        <form onSubmit={handleClaimSubmit} className="card flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-extrabold text-annita-navy-900">Claim Your Mobile Money</h2>
            <p className="hint">Follow the 3 quick steps below to verify proof and receive your payout.</p>
          </div>

          {/* Step 1: Provider Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Step 1: Select Mobile Money Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PROVIDERS.map((p) => {
                const selected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                      selected
                        ? `${p.borderColor} bg-brand-50/60 ring-2 ring-brand-500/20 shadow-2xs`
                        : "border-border bg-surface hover:bg-muted"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold block text-foreground">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground font-semibold">Liberia (LRD)</span>
                    </div>
                    {selected && <CheckCircle2 className="size-5 text-brand-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Account Phone Number */}
          <div className="flex flex-col gap-2">
            <label htmlFor="pnumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Step 2: Mobile Money Account Phone Number
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                +231
              </span>
              <input
                id="pnumber"
                type="tel"
                inputMode="tel"
                value={pnumber}
                onChange={(e) => setPnumber(e.target.value)}
                placeholder="088 123 4567"
                className="input pl-14 font-mono font-bold"
                required
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enter the registered Orange Money or MTN MoMo phone number to receive LRD payout.
            </p>
          </div>

          {/* Step 3: Bill / Receipt Photo Upload */}
          <div className="flex flex-col gap-2">
            <label htmlFor="proof" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Step 3: Upload Bill / Invoice / Receipt Photo (Required)
            </label>

            {filePreview ? (
              <div className="relative flex items-center gap-4 rounded-2xl border border-brand-300 bg-brand-50/50 p-3">
                {/* Image Thumbnail */}
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Receipt Preview" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{file?.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {file ? (file.size / 1024).toFixed(1) : 0} KB · Ready for AI Inspection
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileChange(null)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="proof-upload"
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-all"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 mb-2">
                  <UploadCloud className="size-6" />
                </div>
                <span className="text-xs font-bold text-foreground">Tap or Drag Receipt / Bill Photo</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Supports PNG, JPG, or WEBP invoice photos</span>
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          {/* Optional Invoice Note */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="proofnote" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Invoice Note / Reference (Optional)
            </label>
            <input
              id="proofnote"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="e.g. Tuition receipt #1042"
              className="input text-xs"
            />
          </div>

          {/* Submit Action CTA */}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg w-full gap-2 text-base font-bold shadow-md"
          >
            {submitting ? (
              <>
                <RefreshCw className="size-5 motion-safe:animate-spin" />
                Inspecting Proof & Verifying Payout…
              </>
            ) : (
              <>
                <Zap className="size-5" />
                Verify Proof & Claim Mobile Money
              </>
            )}
          </button>

          {feedback && <p role="status" className="text-xs font-semibold text-brand-800 text-center">{feedback}</p>}
        </form>
      )}
    </div>
  );
}
