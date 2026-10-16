"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Fingerprint,
  Info,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { InfoRow, PageHeader, SectionCard } from "@/components/ui/section-card";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf } from "../../fx";
import { loadSession, type Session } from "../../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const PROVIDERS = [
  {
    id: "MTN",
    name: "MTN Mobile Money",
    hint: "Registered MTN number · LRD payout",
    badge: "MTN",
    badgeClass: "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950",
    border: "border-amber-400",
  },
  {
    id: "ORANGE",
    name: "Orange Money",
    hint: "Registered Orange number · LRD payout",
    badge: "MNY",
    badgeClass: "bg-gradient-to-br from-orange-500 to-amber-600 text-orange-950",
    border: "border-orange-500",
  },
];

/** What the Vision AI expects the photo to reference, per purpose tag. */
const PROOF_KEYWORDS: Record<string, string[]> = {
  SCHOOL: ["school", "tuition", "fees", "semester", "student", "invoice", "bill"],
  FOOD: ["rice", "market", "food", "shop", "store", "receipt", "invoice", "bill"],
  HEALTH: ["clinic", "hospital", "pharmacy", "drug", "bill", "receipt"],
  RENT: ["rent", "landlord", "house", "apartment", "receipt"],
  EMERGENCY: ["hospital", "clinic", "bill", "receipt", "invoice"],
  GENERAL: ["any clear receipt or claim confirmation"],
};

function statusBadge(status: string) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ";
  if (status === "RELEASED") return `${base}bg-emerald-100 text-emerald-800 border border-emerald-300`;
  if (status === "HELD") return `${base}bg-brand-100 text-brand-900 border border-brand-300`;
  if (status === "NEEDS_RETRY" || status === "EXPIRED") return `${base}bg-danger/10 text-danger border border-danger/30`;
  if (status === "REFUNDED") return `${base}bg-muted text-muted-foreground border border-border`;
  return `${base}bg-muted text-muted-foreground border border-border`;
}

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
  const [feedbackKind, setFeedbackKind] = useState<"info" | "pass" | "fail">("info");
  const [nowTick, setNowTick] = useState(() => Date.now());

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

  // Live countdown while the escrow is still claimable.
  useEffect(() => {
    if (!escrow || !["DRAFT", "HELD", "NEEDS_RETRY"].includes(escrow.status)) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [escrow]);

  function speak(text: string, kind: "info" | "pass" | "fail" = "info") {
    setFeedback(text);
    setFeedbackKind(kind);
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
      speak("Please upload a photo of your bill or invoice first. Proof is required before payout.", "fail");
      return;
    }
    if (!pnumber.trim()) {
      speak("Please enter your Mobile Money account phone number.", "fail");
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
        speak(
          `Verification approved! Mobile money payout is on its way to your ${provider} account ${pnumber}.`,
          "pass",
        );
      } else {
        speak(`Verification retry needed. ${j.reason || "Please provide a clearer bill photo."}`, "fail");
      }
    } catch {
      setSubmitting(false);
      speak("Claim submission encountered a network error. Please try again.", "fail");
    }
  }

  const countdown = useMemo(() => {
    if (!escrow?.expires_at) return "";
    const ms = escrow.expires_at * 1000 - nowTick;
    if (ms <= 0) return "window closed";
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  }, [escrow, nowTick]);

  if (sessionLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 aria-hidden="true" className="size-7 text-brand-600 motion-safe:animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying receiver session…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-5 pb-6">
        <div role="alert" className="card flex flex-col gap-3 border-danger/30 bg-danger/5 text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle aria-hidden="true" className="size-6 shrink-0" />
            <h2 className="text-lg font-extrabold">Invalid claim link</h2>
          </div>
          <p className="text-sm leading-relaxed text-foreground">{error}</p>
          <a href="/claim" className="btn btn-primary self-start gap-2">
            <ArrowRight aria-hidden="true" className="size-4" /> Try another ID
          </a>
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2 aria-hidden="true" className="size-7 text-brand-600 motion-safe:animate-spin" />
        <p className="text-sm font-semibold text-muted-foreground">Loading transfer claim session…</p>
      </div>
    );
  }

  const amount = Number(escrow.amount_usd) || 0;
  const fee = Number(escrow.fee_usd) > 0 ? Number(escrow.fee_usd) : feeOf(amount);
  const total = Math.round((amount + fee) * 100) / 100;
  const keywords = PROOF_KEYWORDS[escrow.tag] || PROOF_KEYWORDS.GENERAL;
  const active = ["DRAFT", "HELD", "NEEDS_RETRY"].includes(escrow.status);

  return (
    <div className="flex flex-col gap-5 pb-6">
      <PageHeader
        icon={Lock}
        title={`Claim ${escrow.id}`}
        subtitle={`Purpose-locked transfer to ${escrow.recipient || "the receiver"} · signed in as ${session?.name || "receiver"}. Proof before payout.`}
      />

      {/* Transfer details */}
      <SectionCard title="Transfer details" icon={Banknote} badge={escrow.status}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoRow label="Transfer amount" value={`$${amount.toFixed(2)} USD`} mono />
          <InfoRow label="Receiver payout" value={`${lrdOf(amount).toLocaleString()} LRD`} mono highlight />
          <InfoRow
            label={`Service fee (${FEE_PCT_LABEL}%)`}
            value={`$${fee.toFixed(2)} · sender-paid`}
            mono
          />
          <InfoRow label="Sender charged" value={`$${total.toFixed(2)} USD`} mono />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow
            label="Purpose tag"
            value={
              <span className="rounded-full border border-brand-300 bg-brand-100 px-2.5 py-0.5 text-brand-900">
                {escrow.tag}
              </span>
            }
          />
          <InfoRow label="Note" value={escrow.note || "Purpose-locked remittance"} />
          <InfoRow
            label="Created"
            value={new Date(escrow.created_at * 1000).toLocaleString()}
            mono
          />
          <InfoRow
            label="Auto-refund in"
            value={
              escrow.status === "RELEASED"
                ? "Completed"
                : escrow.status === "REFUNDED" || escrow.status === "EXPIRED"
                  ? "Closed"
                  : countdown || "—"
            }
            mono
            highlight={active}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
          <span className={statusBadge(escrow.status)}>{escrow.status}</span>
          <span className="text-muted-foreground">
            {active
              ? "Funds are held in PayPal escrow — they move only after a passing proof."
              : escrow.status === "RELEASED"
                ? "Payout complete — keep the reference below."
                : "This session is closed."}
          </span>
        </div>
      </SectionCard>

      {/* How this claim works */}
      <SectionCard title="How this claim works" icon={Eye} badge="Prove first">
        <ol className="flex flex-col gap-2.5 text-xs leading-5">
          {[
            ["Confirm the transfer", "Check amount, purpose and payout on this page against what your sender told you."],
            ["Choose your provider", "MTN Mobile Money or Orange Money — whichever number is registered in your name."],
            ["Upload the bill photo", `A clear photo matching the ${escrow.tag} purpose is required — see the checklist below.`],
            ["AI verdict in seconds", "PASS releases the payout instantly. FAIL keeps funds held and tells you exactly why."],
          ].map(([title, detail], i) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-extrabold text-white">
                {i + 1}
              </span>
              <span>
                <strong className="block text-sm font-bold text-foreground">{title}</strong>
                <span className="text-muted-foreground">{detail}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="flex items-start gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs leading-4 text-brand-800">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-brand-600" />
          <span>
            <strong>What the AI looks for:</strong> the photo must reference{" "}
            {keywords.slice(0, -1).join(", ")} or {keywords[keywords.length - 1]}
            {escrow.tag !== "GENERAL" ? ` — anything else fails the ${escrow.tag} lock` : ""}. Photos
            must be at least 5 KB (sharp enough to read).
          </span>
        </div>
      </SectionCard>

      {/* Status-specific outcome cards */}
      {escrow.status === "RELEASED" && (
        <SectionCard title="Payout released" icon={BadgeCheck} badge="PASS">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50/80 p-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
              <BadgeCheck aria-hidden="true" className="size-6" />
            </span>
            <div className="text-xs leading-5 text-emerald-950">
              <p className="text-sm font-extrabold">Mobile money disbursed</p>
              <p className="text-emerald-800">
                Verified by the Vision AI engine — {escrow.verdict_reason || "proof passed the strict check"}.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoRow label="Provider" value={`${escrow.provider} Mobile Money`} mono />
            <InfoRow label="Account phone" value={escrow.provider_number || "—"} mono />
            <InfoRow label="MoMo reference" value={escrow.mock_momo_txn_id || "—"} mono highlight />
          </div>
          <p className="text-xs leading-4 text-muted-foreground">
            Funds went directly to the mobile money account above. Keep the reference for your
            records — the sender can see the same receipt in their ledger.
          </p>
        </SectionCard>
      )}

      {escrow.status === "REFUNDED" || escrow.status === "EXPIRED" ? (
        <SectionCard title={`Claim session closed (${escrow.status})`} icon={Clock} badge="Closed">
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-4 text-xs leading-5">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="text-foreground">
              {escrow.status === "REFUNDED"
                ? "The sender refunded this transfer — the full charge, including the fee, went back to their PayPal."
                : "The claim window closed without passing proof, so the escrow auto-refunded to the sender."}{" "}
              <span className="text-muted-foreground">Ask your sender for a fresh claim link to try again.</span>
            </span>
          </div>
        </SectionCard>
      ) : null}

      {escrow.status === "NEEDS_RETRY" && (
        <SectionCard title="Proof did not pass" icon={AlertTriangle} badge="FAIL">
          <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-xs leading-5">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />
            <span>
              <strong className="block text-sm text-danger">AI verdict: FAIL</strong>
              <span className="text-foreground">{escrow.verdict_reason || "The photo did not match the purpose."}</span>
            </span>
          </div>
          <ul className="flex flex-col gap-1.5 text-xs leading-5 text-muted-foreground">
            <li>• Funds stay safely held in escrow — nothing was released.</li>
            <li>• Retake the photo close to the bill so text is readable, then resubmit below.</li>
            <li>• If the paper genuinely doesn&apos;t match, ask your sender to approve an override (they confirm with their PIN).</li>
          </ul>
        </SectionCard>
      )}

      {/* Claim form */}
      {active ? (
        <>
          <SectionCard title="Step 1 · Payout provider" icon={Smartphone} badge="Choose one">
            <div className="grid gap-3 sm:grid-cols-2">
              {PROVIDERS.map((p) => {
                const selected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    aria-pressed={selected}
                    className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                      selected
                        ? `${p.border} bg-brand-50/60 ring-2 ring-brand-500/20 shadow-2xs`
                        : "border-border bg-surface hover:bg-muted"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${p.badgeClass}`}
                      >
                        {p.badge}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-sm font-bold text-foreground">{p.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{p.hint}</span>
                      </div>
                    </div>
                    {selected ? (
                      <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-brand-600" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard title="Step 2 · Mobile money number" icon={Smartphone}>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pnumber" className="text-xs font-bold text-foreground">
                Registered phone number for the {provider === "MTN" ? "MTN" : "Orange"} payout
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
              <p className="text-xs text-muted-foreground">
                Enter the number registered to you — the LRD payout is released here the moment the
                proof passes. USD value: {lrdOf(amount).toLocaleString()} LRD at 1 USD = {USD_LRD} LRD.
              </p>
            </div>
          </SectionCard>

          <form onSubmit={handleClaimSubmit} className="contents">
            <SectionCard title="Step 3 · Bill photo proof" icon={FileText} badge="Required">
              {filePreview ? (
                <div className="flex items-center gap-4 rounded-2xl border border-brand-300 bg-brand-50/50 p-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={filePreview} alt="Receipt Preview" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">{file?.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {file ? (file.size / 1024).toFixed(1) : 0} KB ·{" "}
                      {(file?.size || 0) >= 5000 ? "Ready for AI inspection" : "Too small — retake closer to the bill"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFileChange(null)}
                    aria-label="Remove photo"
                    className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="proof-upload"
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-all"
                >
                  <div className="mb-2 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <UploadCloud aria-hidden="true" className="size-6" />
                  </div>
                  <span className="text-xs font-bold text-foreground">Tap or drag your bill / invoice photo</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    PNG, JPG or WEBP · at least 5 KB · must reference the {escrow.tag} purpose
                  </span>
                  <input
                    id="proof-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    className="sr-only"
                  />
                </label>
              )}

              <div className="flex flex-col gap-1.5">
                <label htmlFor="proofnote" className="text-xs font-bold text-foreground">
                  Invoice note / reference (optional)
                </label>
                <input
                  id="proofnote"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder={escrow.tag === "SCHOOL" ? "e.g. Tuition receipt #1042" : "e.g. Invoice #1042"}
                  className="input text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Tip: words like{" "}
                  <code className="rounded bg-muted px-1 font-mono text-foreground">
                    {keywords.slice(0, 3).join(", ")}
                  </code>{" "}
                  in the note or filename help the AI match the purpose.
                </p>
              </div>
            </SectionCard>

            <SectionCard title="Submit for AI verification" icon={Zap} badge="Instant verdict">
              <p className="text-xs leading-5 text-muted-foreground">
                On submit the Vision AI inspects the photo against the{" "}
                <strong className="text-foreground">{escrow.tag}</strong> lock and returns PASS or
                FAIL with a reason. Your payout of{" "}
                <strong className="text-foreground">{lrdOf(amount).toLocaleString()} LRD</strong>{" "}
                releases immediately on PASS.
              </p>
              <div className="flex justify-end border-t border-border pt-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary gap-2 font-bold"
                >
                  {submitting ? (
                    <>
                      <RefreshCw aria-hidden="true" className="size-4 motion-safe:animate-spin" />
                      Inspecting proof & verifying payout…
                    </>
                  ) : (
                    <>
                      <Fingerprint aria-hidden="true" className="size-4" />
                      Verify proof & claim mobile money
                    </>
                  )}
                </button>
              </div>
              {feedback ? (
                <p
                  role="status"
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                    feedbackKind === "pass"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : feedbackKind === "fail"
                        ? "border-danger/30 bg-danger/10 text-danger"
                        : "border-brand-200 bg-brand-50 text-brand-800"
                  }`}
                >
                  {feedback}
                </p>
              ) : null}
            </SectionCard>
          </form>
        </>
      ) : null}

      {/* Safety */}
      <SectionCard title="Safety & rules" icon={ShieldCheck} badge="Always on">
        <div className="flex flex-col gap-2 text-xs leading-5 text-foreground">
          <p>
            <strong>Proof before payout.</strong>{" "}
            <span className="text-muted-foreground">
              Money stays in PayPal escrow until a passing bill photo — this page is the only place
              that release happens.
            </span>
          </p>
          <p>
            <strong>Fees never come out of your payout.</strong>{" "}
            <span className="text-muted-foreground">
              The {FEE_PCT_LABEL}% service fee (${fee.toFixed(2)} on this transfer) was paid by your
              sender on top of the amount — you receive the full ${amount.toFixed(2)}.
            </span>
          </p>
          <p>
            <strong>Auto-refund protection.</strong>{" "}
            <span className="text-muted-foreground">
              {active && countdown
                ? `This escrow auto-refunds in ${countdown} if no passing proof arrives.`
                : "Unclaimed escrow auto-refunds to the sender after the claim window closes."}
            </span>
          </p>
          <p>
            <strong>Your link is the credential.</strong>{" "}
            <span className="text-muted-foreground">
              Never share the claim URL publicly. Ezri staff will never ask for a PIN or password.
            </span>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoRow label="Escrow holder" value="PayPal (sandbox in demo)" mono />
          <InfoRow
            label="Status"
            value={<span className={statusBadge(escrow.status)}>{escrow.status}</span>}
          />
        </div>
      </SectionCard>
    </div>
  );
}
