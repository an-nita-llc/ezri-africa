"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { get as idbGet, set as idbSet } from "idb-keyval";
import {
  AudioLines,
  Bot,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileText,
  History as HistoryIcon,
  Loader2,
  Lock,
  Mic,
  Pause,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import Link from "next/link";
import PayPalButtons from "./PayPalButtons";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf, totalOf } from "./fx";
import { authHeaders, loadSession, type Session } from "./session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PP_CID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const DEMO_PIN = "1234";
const SPEECH_KEY = "ezri:speech_enabled";

const INITIAL_CHIPS = [
  "Send $60 to mom for school",
  "Send $120 for hospital bill",
  "Send $45 for grocery food",
  "Send $200 for rent",
  "What are the fees?",
  "Configure Purpose Lock",
];

const CHAT_CHIPS = [
  "Send $60 to mom for school",
  "What are the fees?",
  "How does escrow work?",
  "View Ledger",
];

const MONEY_STEPS = [
  "Reading your message",
  "Extracting amount, recipient & purpose",
  "Fetching live FX rate (USD → LRD)",
  `Computing ${FEE_PCT_LABEL}% fee & fraud score`,
  "Applying purpose lock rules",
];

const CHAT_STEPS = [
  "Reading your message",
  "Classifying intent (transfer vs question)",
  "Matching knowledge: fees · escrow · claiming",
  "Composing reply",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  card?: any;
  chips?: string[];
}

type AgentStep = { label: string; status: "queued" | "running" | "done" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusBadge(status: string) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ";
  if (status === "RELEASED") return `${base}bg-annita-green/15 text-annita-green-dark border border-annita-green/30`;
  if (status === "HELD") return `${base}bg-brand-100 text-brand-900 border border-brand-300`;
  if (status === "NEEDS_RETRY" || status === "EXPIRED") return `${base}bg-danger/10 text-danger border border-danger/30`;
  return `${base}bg-muted text-muted-foreground border border-border`;
}

function downloadRemittanceSlip(escrowRecord: any, sessionName: string, sessionEmail: string) {
  if (!escrowRecord) return;
  const amount = escrowRecord.amount_usd || 60;
  const fee = escrowRecord.fee_usd || feeOf(amount);
  const total = amount + fee;
  const lrd = amount * 192;

  const slip = `
====================================================
           EZRI AFRICA — REMITTANCE SLIP
            Purpose-Locked Escrow Receipt
====================================================
Date / Time:     ${new Date().toLocaleString()}
Escrow Session:  ${escrowRecord.escrow_id || escrowRecord.id || "EZR-8F32A1"}
PayPal Order ID: ${escrowRecord.paypal_order_id || "PAYPAL-SANDBOX-DEMO"}
Status:          ${escrowRecord.status || "HELD"}

----------------------------------------------------
SENDER & PURPOSE DETAILS
----------------------------------------------------
Sender Name:     ${sessionName || "Demo Sender"}
Sender Email:    ${sessionEmail || "demo@ezri.africa"}
Purpose Tag:     ${escrowRecord.tag || "SCHOOL"}
Note:            ${escrowRecord.note || "Purpose-locked remittance"}

----------------------------------------------------
FINANCIAL BREAKDOWN
----------------------------------------------------
Transfer Amount: $${amount.toFixed(2)} USD
Ezri Fee (2%):   $${fee.toFixed(2)} USD
Total Charged:   $${total.toFixed(2)} USD

Exchange Rate:   1 USD = 192.00 LRD
Local Payout:    ${lrd.toLocaleString()} LRD

----------------------------------------------------
RECEIVER CLAIM INSTRUCTIONS
----------------------------------------------------
Claim Link:      ${typeof window !== "undefined" ? window.location.origin : ""}/claim/${escrowRecord.escrow_id || escrowRecord.id || "EZR-8F32A1"}

Steps for Receiver:
1. Open the claim link in any browser.
2. Select your receiving provider (Mobile Money or Commercial Bank).
3. Upload your invoice / bill photo proof for Vision AI inspection.
4. Mobile money payout is disbursed automatically upon verification.

====================================================
      Protected by PayPal Escrow & OpenRouter AI
====================================================
`;

  const blob = new Blob([slip], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ezri-Remittance-Slip-${escrowRecord.escrow_id || escrowRecord.id || "EZR"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Live agent activity panel ── */
function AgentActivityCard({ run }: { run: { title: string; steps: AgentStep[] } }) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground">
          <span>Ezri AI Agent</span>
          <span className="text-xs text-muted-foreground/70">{now()}</span>
        </div>
        <div className="rounded-2xl border border-annita-navy-800 bg-annita-navy-950 p-4 font-mono text-xs text-white/90 flex flex-col gap-2.5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-300">
              <Bot aria-hidden="true" className="size-4" /> {run.title}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/50">
              <span className="size-1.5 rounded-full bg-annita-green animate-pulse" />
              live
            </span>
          </div>
          {run.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-2">
              {step.status === "done" ? (
                <Check aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-annita-green" />
              ) : step.status === "running" ? (
                <Loader2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 animate-spin text-brand-300" />
              ) : (
                <span aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-center leading-none text-white/30">·</span>
              )}
              <span className={step.status === "queued" ? "text-white/40" : ""}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Approval gate ── */
function ApprovalCard({
  approval,
  pinStage,
  pin,
  pinError,
  onApprove,
  onConfirmPin,
  onBack,
  onCancel,
  onPinChange,
}: {
  approval: { amount: number; tag: string };
  pinStage: boolean;
  pin: string;
  pinError: string;
  onApprove: () => void;
  onConfirmPin: () => void;
  onBack: () => void;
  onCancel: () => void;
  onPinChange: (v: string) => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground">
          <span>Ezri AI Agent</span>
          <span className="text-xs text-muted-foreground/70">paused</span>
        </div>
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs flex flex-col gap-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2 font-bold">
            <span className="flex items-center gap-1.5 text-sm text-amber-800">
              <Pause aria-hidden="true" className="size-4" /> Agent paused — approval required
            </span>
            <span className="text-base font-extrabold text-amber-950">${approval.amount} USD</span>
          </div>

          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block font-semibold text-muted-foreground">Action</span>
              <span className="font-extrabold text-foreground">PayPal → escrow hold</span>
            </div>
            <div>
              <span className="block font-semibold text-muted-foreground">Purpose Lock</span>
              <span className="font-extrabold text-foreground">{approval.tag}</span>
            </div>
          </div>

          {!pinStage ? (
            <>
              <p className="text-xs leading-relaxed text-amber-900/80">
                I will not move money without your approval. Confirm to continue to PIN entry.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onApprove}
                  className="btn btn-primary btn-sm gap-1"
                >
                  <ShieldAlert aria-hidden="true" className="size-3.5" /> Approve &amp; enter PIN
                </button>
                <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm">
                  Cancel — move nothing
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="agent-pin" className="font-bold text-foreground">
                  Enter your 4-digit money PIN
                </label>
                <input
                  id="agent-pin"
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => onPinChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                  placeholder="••••"
                  className="input text-center font-mono text-xl font-bold tracking-[0.6em]"
                />
                {pinError ? <p className="text-xs font-bold text-danger">{pinError}</p> : null}
                <p className="text-xs text-muted-foreground">Demo PIN: 1234</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onConfirmPin}
                  className="btn btn-primary btn-sm gap-1"
                >
                  <Zap aria-hidden="true" className="size-3.5" /> Confirm PIN &amp; move money
                </button>
                <button type="button" onClick={onBack} className="btn btn-secondary btn-sm">
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Chat message item ── */
function ChatMessageItem({
  msg,
  sessionName,
  onRequestPay,
  onTagChange,
}: {
  msg: Message;
  sessionName: string;
  onRequestPay: () => void;
  onTagChange: (tag: string) => void;
}) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground">
          <span>{msg.role === "assistant" ? "Ezri AI" : sessionName}</span>
          <span className="text-xs text-muted-foreground/70">{msg.time}</span>
        </div>

        <div
          className={`max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
            msg.role === "user"
              ? "bg-gradient-to-r from-annita-navy-800 to-annita-navy-950 text-white rounded-br-md w-fit ml-auto"
              : "bg-surface border border-border text-foreground rounded-bl-md w-fit shadow-2xs"
          }`}
        >
          {msg.text}

          {/* Step 1 card */}
          {msg.card?.kind === "setup" && (
            <div className="mt-3 rounded-2xl border border-brand-300 bg-brand-50/70 p-4 text-foreground text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-brand-200 pb-2 font-bold">
                <span className="text-brand-700 flex items-center gap-1 text-sm">
                  <Lock className="size-4" /> Step 1 · Confirm Transfer
                </span>
                <span className="text-base font-extrabold">${msg.card.amount_usd} USD</span>
              </div>

              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block font-semibold">Sending To</span>
                  <span className="font-extrabold text-foreground capitalize">{msg.card.recipient || "mom"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-semibold">Estimated Payout</span>
                  <span className="font-extrabold text-foreground">{msg.card.fx_lrd} LRD</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-foreground">Purpose Lock (tap to change)</span>
                <div className="flex flex-wrap gap-1.5">
                  {["FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onTagChange(t)}
                      aria-pressed={msg.card.tag === t}
                      className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                        msg.card.tag === t
                          ? "bg-brand-600 text-white"
                          : "bg-surface border border-brand-200 text-brand-700 hover:bg-brand-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand-200 bg-surface px-3 py-2 text-xs">
                <span className="font-bold text-foreground">Fraud Risk Assessment</span>
                <span className={`font-extrabold ${msg.card.fraud_score >= 50 ? "text-danger" : "text-annita-green-dark"}`}>
                  {msg.card.fraud_score}/100{msg.card.fraud_score < 50 ? " (Safe)" : ""}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-surface px-3 py-2 text-xs">
                <span className="font-bold text-foreground">
                  Ezri fee ({FEE_PCT_LABEL}%) · sender-paid
                </span>
                <span className="font-extrabold text-foreground">
                  +$
                  {(Number(msg.card.fee_usd) > 0
                    ? Number(msg.card.fee_usd)
                    : feeOf(Number(msg.card.amount_usd) || 0)
                  ).toFixed(2)}{" "}
                  · total $
                  {totalOf(Number(msg.card.amount_usd) || 0).toFixed(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={onRequestPay}
                className="btn btn-primary btn-block gap-2 text-sm font-bold shadow-sm"
              >
                <Zap className="size-4" /> Step 2 · Request Escrow (agent asks approval + PIN)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlugPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [chips, setChips] = useState<string[]>(INITIAL_CHIPS);
  const [parsed, setParsed] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // AI Speech Read-back State (DISABLED BY DEFAULT - requires user approval)
  const [speechEnabled, setSpeechEnabled] = useState(false);

  // Live agent activity + approval gates
  const [agentRun, setAgentRun] = useState<{ title: string; steps: AgentStep[] } | null>(null);
  const [approval, setApproval] = useState<{ amount: number; tag: string } | null>(null);
  const [pinStage, setPinStage] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SPEECH_KEY);
      if (stored === "true") setSpeechEnabled(true);
    } catch {}
  }, []);

  function toggleSpeech() {
    setSpeechEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SPEECH_KEY, String(next));
      } catch {}
      return next;
    });
  }

  const say = useCallback((text: string, cardData?: any, chipsList?: string[]) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((m) => [...m, { id, role: "assistant", text, time: now(), card: cardData, chips: chipsList }]);
    if (chipsList) setChips(chipsList);

    if (speechEnabled) {
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-US";
        window.speechSynthesis?.speak(u);
      } catch {}
    }
  }, [speechEnabled]);

  const initWelcome = useCallback((s: Session) => {
    const welcomeText = `${greeting()}, ${s.name || "Demo Sender"}\n\nPurpose-Locked Remittance\nPayPal foreign collection → AI purpose lock → Strict proof check → Mobile Money disburse\n\nLive FX Rate: 1 USD = ${USD_LRD} LRD\nService fee: ${FEE_PCT_LABEL}% per transfer — always shown for your approval before money moves`;

    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        text: welcomeText,
        time: now(),
        chips: INITIAL_CHIPS,
      },
    ]);
    setChips(INITIAL_CHIPS);
    setEscrow(null);
    setParsed(null);
    setApproval(null);
    setAgentRun(null);
  }, []);

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
      initWelcome(s);
    });
    return () => {
      alive = false;
    };
  }, [router, initWelcome]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, agentRun, approval, escrow]);

  async function advanceSteps(total: number, ms: number) {
    for (let i = 0; i < total; i++) {
      await sleep(ms);
      setAgentRun((run) => {
        if (!run) return run;
        const steps = run.steps.map((s, idx) => ({
          ...s,
          status: (idx < i + 1 ? "done" : idx === i + 1 ? "running" : s.status) as AgentStep["status"],
        }));
        return { ...run, steps };
      });
    }
    await sleep(320);
  }

  async function sendText(cmdText = input) {
    if (!cmdText.trim()) return;

    if (cmdText === "Configure Purpose Lock") {
      router.push("/purpose-lock");
      return;
    }

    setMessages((m) => [...m, { id: `usr-${Date.now()}`, role: "user", text: cmdText, time: now() }]);
    setInput("");
    setSending(true);

    const looksLikeTransfer =
      /\b(send|sends|transfer|transfers|pay|pays|remit|top-?up|wire|move)\b/i.test(cmdText) &&
      /[$]|\b\d+(?:\.\d+)?\b/.test(cmdText);
    const steps = looksLikeTransfer ? MONEY_STEPS : CHAT_STEPS;
    setAgentRun({
      title: "Analyzing your request",
      steps: steps.map((label, i) => ({
        label,
        status: (i === 0 ? "running" : "queued") as AgentStep["status"],
      })),
    });

    const agentDone = advanceSteps(steps.length, looksLikeTransfer ? 480 : 460);
    try {
      const r = await fetch(`${API}/api/chat/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cmdText, note: "" }),
      });
      const j = await r.json();
      await agentDone;
      setAgentRun(null);
      const intent = j.intent || "transfer";
      if (intent !== "transfer") {
        setParsed(null);
        say(
          j.reply ||
            "I can set up purpose-locked transfers end to end. Tell me a transfer (e.g. “Send $120 for hospital bill”), or ask about fees, escrow or claiming.",
          undefined,
          CHAT_CHIPS,
        );
      } else {
        setParsed(j);
        const fee = Number(j.fee_usd) > 0 ? Number(j.fee_usd) : feeOf(j.amount_usd);
        const total = Math.round((j.amount_usd + fee) * 100) / 100;
        say(
          `I can lock $${j.amount_usd} USD for ${j.tag} — receiver gets ${Number(j.fx_lrd).toLocaleString()} LRD, Ezri fee ${FEE_PCT_LABEL}% ($${fee.toFixed(2)}) → $${total.toFixed(2)} charged to you. Review the purpose lock below — tap a tag to change it. Nothing moves until you approve and enter your PIN.`,
          { ...j, kind: "setup" },
          ["Hold & Pay", "Configure Purpose Lock", "View Ledger"],
        );
      }
    } catch {
      await agentDone;
      setAgentRun(null);
      say("No connection to AI service. Command saved to queue.");
    } finally {
      setSending(false);
    }
  }

  async function captureNow(eid: string, oid: string) {
    if (!session) return;
    const c = await fetch(`${API}/api/escrow/capture`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ escrow_id: eid, paypal_order_id: oid }),
    });
    const cj = await c.json();
    setEscrow((e: any) => ({ ...e, status: cj.status, capture_id: cj.capture_id }));
    say("Captured & HELD in PayPal sandbox escrow. Share the claim link below with the receiver.");
  }

  function requestPay() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!parsed) {
      say(
        "We haven't set up a transfer yet. Tell me what to send first — for example “Send $60 to mom for school” — and I'll show the full breakdown before anything moves.",
        undefined,
        ["Send $60 to mom for school", "What are the fees?"],
      );
      return;
    }
    const p = parsed;
    setApproval({ amount: p.amount_usd, tag: p.tag || "SCHOOL" });
    setPinStage(false);
    setPin("");
    setPinError("");
    say("Paused before moving money. Review the approval request below — you are always in control.");
  }

  async function executePay() {
    if (pin !== DEMO_PIN) {
      setPinError("Wrong PIN. Your demo PIN is 1234.");
      return;
    }
    setApproval(null);
    setPinStage(false);
    setPin("");
    setPinError("");

    const p = parsed || { amount_usd: 60, tag: "SCHOOL", note: "Transfer", recipient: "mom" };
    setAgentRun({
      title: "Moving money — PayPal sandbox escrow",
      steps: [
        { label: "PIN verified · approval recorded on ledger", status: "running" },
        { label: "Authenticating PayPal sandbox session", status: "queued" },
        { label: `Creating order for $${p.amount_usd} USD`, status: "queued" },
        { label: "Capturing funds into escrow", status: "queued" },
        { label: "Locking purpose & generating claim link", status: "queued" },
      ],
    });

    const agentDone = advanceSteps(5, 620);
    try {
      const r = await fetch(`${API}/api/escrow/create`, {
        method: "POST",
        headers: authHeaders(session!.token),
        body: JSON.stringify({
          amount_usd: p.amount_usd,
          tag: p.tag || "SCHOOL",
          note: p.note || "Transfer",
          recipient: p.recipient || "mom",
        }),
      });
      const j = await r.json();
      setEscrow(j);
      if (String(j.paypal_order_id || "").startsWith("MOCK-")) {
        await captureNow(j.escrow_id, j.paypal_order_id);
      } else {
        say(`PayPal Order ${j.paypal_order_id} created. Approve it via the PayPal button in the escrow card.`);
      }
    } catch {
      say("Payment step failed — no money moved. Try again once you're back online.");
    } finally {
      await agentDone;
      setAgentRun(null);
    }
  }

  function cancelPay() {
    setApproval(null);
    setPinStage(false);
    setPin("");
    setPinError("");
    say("Cancelled — nothing moved. I'll wait here whenever you're ready.");
  }

  function copyClaim() {
    if (!escrow?.escrow_id) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/claim/${escrow.escrow_id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function handleChipTap(chip: string) {
    if (chip === "Hold & Pay") {
      requestPay();
    } else if (chip === "View Ledger") {
      router.push("/dashboard");
    } else {
      void sendText(chip);
    }
  }

  function handleRecordTap() {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return say("Voice recognition is not supported in this browser.");
    const rec = new SR();
    rec.lang = "en-US";
    rec.onstart = () => setIsRecording(true);
    rec.onend = () => setIsRecording(false);
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.start();
    say("Listening... Speak now.");
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Initializing OpenRouter AI Engine…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 w-full flex-1 overflow-hidden bg-background relative">
      {/* Header Bar */}
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-3 py-2 sm:px-4 sm:py-3 z-10">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-xs shadow-xs">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1">
              Remittance AI
              <Sparkles className="size-3.5 text-brand-600" />
            </h1>
            <p className="text-xs text-muted-foreground">OpenRouter AI Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SPEAKER READ-BACK TOGGLE BUTTON (Muted by default) */}
          <button
            type="button"
            onClick={toggleSpeech}
            aria-label={speechEnabled ? "Mute AI Voice" : "Approve & Enable AI Voice Read-Back"}
            title={speechEnabled ? "AI Voice Active (Click to Mute)" : "Enable AI Voice Read-Back"}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              speechEnabled
                ? "bg-brand-50 border-brand-300 text-brand-700 shadow-2xs"
                : "bg-surface border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {speechEnabled ? <Volume2 className="size-4 text-brand-600 animate-pulse" /> : <VolumeX className="size-4" />}
            <span className="hidden min-[450px]:inline">{speechEnabled ? "Voice Active" : "Muted"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (session) initWelcome(session);
            }}
            className="p-2 rounded-lg hover:bg-muted transition text-foreground"
            title="New Chat"
          >
            <Plus className="h-5 w-5" />
          </button>
          <Link href="/dashboard" className="p-2 rounded-lg hover:bg-muted transition text-foreground" title="Ledger">
            <HistoryIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {/* Chat Scroll Thread */}
      <div
        ref={scrollRef}
        className="scroll-thread flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-3 min-w-0 min-h-0 sm:px-4 sm:py-6 sm:space-y-4"
      >
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            msg={msg}
            sessionName={session?.name || "You"}
            onRequestPay={requestPay}
            onTagChange={(t) => setParsed((p: any) => (p ? { ...p, tag: t } : p))}
          />
        ))}

        {/* Live agent activity */}
        {agentRun && <AgentActivityCard run={agentRun} />}

        {/* Approval gate */}
        {approval && (
          <ApprovalCard
            approval={approval}
            pinStage={pinStage}
            pin={pin}
            pinError={pinError}
            onApprove={() => setPinStage(true)}
            onConfirmPin={() => void executePay()}
            onBack={() => {
              setPinStage(false);
              setPin("");
              setPinError("");
            }}
            onCancel={cancelPay}
            onPinChange={(v) => {
              setPin(v);
              setPinError("");
            }}
          />
        )}

        {/* Step 2 card: escrow session + claim link + PayPal approval + Download Slip button */}
        {escrow && (
          <div className="flex justify-start">
            <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
              <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground">
                <span>Ezri AI</span>
                <span className="text-xs text-muted-foreground/70">Escrow</span>
              </div>
              <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 text-foreground text-xs flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-brand-200 pb-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Step 2 · Escrow Session
                    </span>
                    <p className="font-mono text-xs font-extrabold">{escrow.escrow_id}</p>
                  </div>
                  <span className={statusBadge(escrow.status)}>{escrow.status}</span>
                </div>

                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-semibold">Transfer amount</span>
                    <span className="font-extrabold text-foreground">
                      ${(Number(escrow.amount_usd) || 0).toFixed(2)} USD
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-semibold">
                      Ezri fee ({FEE_PCT_LABEL}%) · total charged
                    </span>
                    <span className="font-extrabold text-foreground">
                      ${feeOf(Number(escrow.amount_usd) || 0).toFixed(2)} · $
                      {(Number(escrow.total_usd) > 0
                        ? Number(escrow.total_usd)
                        : totalOf(Number(escrow.amount_usd) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-foreground">
                    Receiver Claim Link (Zero Login Needed)
                  </span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/claim/${escrow.escrow_id}`}
                      className="input font-mono text-xs bg-surface flex-1 min-h-10"
                    />
                    <button
                      type="button"
                      onClick={copyClaim}
                      className="btn btn-primary shrink-0 gap-1 btn-sm"
                    >
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                      {copied ? "Copied" : "Copy Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadRemittanceSlip(escrow, session?.name || "Sender", session?.email || "")
                      }
                      className="btn btn-secondary shrink-0 gap-1 btn-sm"
                      title="Download Invoice Slip"
                    >
                      <Download className="size-3.5" /> Slip
                    </button>
                    <a
                      href={`/claim/${escrow.escrow_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary shrink-0 gap-1 btn-sm"
                    >
                      <ExternalLink className="size-3.5" /> Open
                    </a>
                  </div>
                </div>

                {escrow.status === "DRAFT" && (
                  <div className="pt-2 border-t border-brand-200">
                    <p className="font-bold text-xs mb-2">Complete Payment in PayPal Sandbox</p>
                    <PayPalButtons
                      orderId={escrow.paypal_order_id}
                      clientId={PP_CID}
                      onApproved={() => { void captureNow(escrow.escrow_id, escrow.paypal_order_id); }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Chips */}
      {chips.length > 0 && (
        <div className="px-3 pb-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 min-w-0 sm:px-4 sm:pb-2.5 sm:gap-2.5 bg-background">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipTap(chip)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold border transition hover:opacity-80 whitespace-nowrap border-brand-300 text-brand-700 bg-brand-50"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Sticky Chat Input Bar */}
      <div className="sticky bottom-0 left-0 right-0 z-20 bg-surface px-3 pt-2 pb-3 shrink-0 border-t border-border shadow-md">
        <div className="flex items-end gap-2 max-w-full overflow-hidden">
          {/* Pill container */}
          <div className="flex-1 flex items-center bg-muted/60 rounded-full min-h-[44px] max-h-[44px] px-2 py-1.5 border border-border overflow-hidden min-w-0">
            <button
              type="button"
              onClick={handleRecordTap}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
                isRecording ? "bg-danger text-white animate-pulse" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <AudioLines className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendText();
                }
              }}
              placeholder="Send $60 to mom for school, lock it"
              className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 min-w-0 w-full"
            />

            <button
              type="button"
              onClick={handleRecordTap}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-muted transition text-muted-foreground"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void sendText()}
            className="w-[42px] h-[42px] rounded-full flex items-center justify-center shrink-0 bg-brand-600 text-white transition hover:bg-brand-700 shadow-sm active:scale-95 cursor-pointer"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
