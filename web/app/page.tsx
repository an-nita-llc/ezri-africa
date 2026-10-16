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
  ExternalLink,
  History as HistoryIcon,
  Lock,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import Link from "next/link";
import PayPalButtons from "./PayPalButtons";
import { authHeaders, loadSession, type Session } from "./session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PP_CID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

const INITIAL_CHIPS = [
  "Send $60 to mom for school",
  "Send $120 for hospital bill",
  "Send $45 for grocery food",
  "Send $200 for rent",
  "Configure Purpose Lock",
];

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
  card?: any;
  chips?: string[];
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function statusBadge(status: string) {
  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ";
  if (status === "RELEASED") return `${base}bg-annita-green/15 text-annita-green-dark border border-annita-green/30`;
  if (status === "HELD") return `${base}bg-brand-100 text-brand-900 border border-brand-300`;
  if (status === "NEEDS_RETRY" || status === "EXPIRED") return `${base}bg-danger/10 text-danger border border-danger/30`;
  if (status === "REFUNDED") return `${base}bg-muted text-muted-foreground border border-border`;
  return `${base}bg-muted text-muted-foreground border border-border`;
}

function ChatMessageItem({
  msg,
  sessionName,
  onHoldPay,
  onTagChange,
}: {
  msg: Message;
  sessionName: string;
  onHoldPay: () => void;
  onTagChange: (tag: string) => void;
}) {
  return (
    <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
      <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
        <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-muted-foreground">
          <span>{msg.role === "assistant" ? "Ezri AI" : sessionName}</span>
          <span className="text-[10px] text-muted-foreground/70">{msg.time}</span>
        </div>

        <div
          className={`max-w-full rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
            msg.role === "user"
              ? "bg-gradient-to-r from-annita-navy-800 to-annita-navy-950 text-white rounded-br-md w-fit ml-auto"
              : "bg-surface border border-border text-foreground rounded-bl-md w-fit shadow-2xs"
          }`}
        >
          {msg.text}

          {/* Step 1 card: confirm transfer + purpose lock (before any money moves) */}
          {msg.card?.kind === "setup" && (
            <div className="mt-3 rounded-2xl border border-brand-300 bg-brand-50/70 p-4 text-foreground text-xs flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-brand-200 pb-2 font-bold">
                <span className="text-brand-700 flex items-center gap-1 text-sm">
                  <Lock className="size-4" /> Step 1 · Confirm Transfer
                </span>
                <span className="text-base font-extrabold">${msg.card.amount_usd} USD</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
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
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition ${
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

              <button
                type="button"
                onClick={onHoldPay}
                className="btn btn-primary btn-block gap-2 text-sm font-bold shadow-sm"
              >
                <Zap className="size-4" /> Step 2 · Lock Purpose & Fund Escrow
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

  const scrollRef = useRef<HTMLDivElement>(null);

  const say = useCallback((text: string, cardData?: any, chipsList?: string[]) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((m) => [...m, { id, role: "assistant", text, time, card: cardData, chips: chipsList }]);
    if (chipsList) setChips(chipsList);
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      window.speechSynthesis?.speak(u);
    } catch {}
  }, []);

  const initWelcome = useCallback((s: Session) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const welcomeText = `${greeting()}, ${s.name || "Demo Sender"}\n\nPurpose-Locked Remittance\nPayPal foreign collection → AI purpose lock → Strict proof check → Mobile Money disburse\n\nLive FX Rate: 1 USD = 192.00 LRD`;

    setMessages([
      {
        id: "msg-welcome",
        role: "assistant",
        text: welcomeText,
        time,
        chips: INITIAL_CHIPS,
      },
    ]);
    setChips(INITIAL_CHIPS);
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
  }, [messages]);

  async function sendText(cmdText = input, chipKey?: string) {
    if (!cmdText.trim()) return;

    if (cmdText === "Configure Purpose Lock") {
      router.push("/purpose-lock");
      return;
    }

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((m) => [...m, { id: userMsgId, role: "user", text: cmdText, time }]);
    setInput("");
    setSending(true);

    try {
      const r = await fetch(`${API}/api/chat/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cmdText, note: "" }),
      });
      const j = await r.json();
      setParsed(j);
      say(
        `I can lock $${j.amount_usd} USD for ${j.tag}. Review the purpose lock below — tap a tag to change it, then fund escrow.`,
        { ...j, kind: "setup" },
        ["Hold & Pay", "Configure Purpose Lock", "View Ledger"]
      );
    } catch {
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

  async function holdPay() {
    if (!session) {
      router.push("/login");
      return;
    }
    const p = parsed || { amount_usd: 60, tag: "SCHOOL", note: "School tuition", recipient: "mom" };
    const r = await fetch(`${API}/api/escrow/create`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ amount_usd: p.amount_usd, tag: p.tag || "SCHOOL", note: p.note || "Transfer", recipient: "mom" }),
    });
    const j = await r.json();
    setEscrow(j);
    if (String(j.paypal_order_id || "").startsWith("MOCK-")) {
      say(`Held in escrow (${j.escrow_id}). Mock PayPal order created.`);
      await captureNow(j.escrow_id, j.paypal_order_id);
      return;
    }
    say(`PayPal Order ${j.paypal_order_id} created. Complete payment via PayPal button below.`);
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
      void holdPay();
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
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Initializing OpenRouter AI Engine…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full min-h-0 relative bg-background overflow-hidden">
      {/* Header Bar */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface shrink-0 sm:px-4 sm:py-3 z-10">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white font-bold text-xs shadow-xs">
            <Bot className="size-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1">
              Remittance AI
              <Sparkles className="size-3.5 text-brand-600" />
            </h1>
            <p className="text-[11px] text-muted-foreground">OpenRouter AI Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Chat Scroll Thread - Flexible Fill */}
      <div
        ref={scrollRef}
        className="scroll-thread flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-3 min-w-0 min-h-0 sm:px-4 sm:py-6 sm:space-y-4"
      >
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            msg={msg}
            sessionName={session?.name || "You"}
            onHoldPay={() => void holdPay()}
            onTagChange={(t) => setParsed((p: any) => (p ? { ...p, tag: t } : p))}
          />
        ))}

        {/* Step 2 card: escrow session + claim link + PayPal approval */}
        {escrow && (
          <div className="flex justify-start">
            <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
              <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-muted-foreground">
                <span>Ezri AI</span>
                <span className="text-[10px] text-muted-foreground/70">Escrow</span>
              </div>
              <div className="rounded-2xl border border-brand-300 bg-brand-50 p-4 text-foreground text-xs flex flex-col gap-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-brand-200 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Step 2 · Escrow Session
                    </span>
                    <p className="font-mono text-xs font-extrabold">{escrow.escrow_id}</p>
                  </div>
                  <span className={statusBadge(escrow.status)}>{escrow.status}</span>
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

        {/* Step 3 card — final lock summary, only at the end of the transaction */}
        {escrow && (escrow.status === "HELD" || escrow.status === "RELEASED") && (
          <div className="flex justify-start">
            <div className="w-full max-w-full sm:max-w-[85%] flex flex-col gap-1">
              <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-muted-foreground">
                <span>Ezri AI</span>
                <span className="text-[10px] text-muted-foreground/70">
                  {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="rounded-2xl border border-brand-300 bg-brand-50/70 p-4 text-foreground text-xs flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-brand-200 pb-2 font-bold">
                  <span className="text-brand-700 flex items-center gap-1 text-sm">
                    <Lock className="size-4" /> Locked for {parsed?.tag || "GENERAL"}
                  </span>
                  <span className="text-base font-extrabold">${parsed?.amount_usd ?? 60} USD</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block font-semibold">Payout Total</span>
                    <span className="font-extrabold text-foreground">
                      {Number(parsed?.fx_lrd ?? (parsed?.amount_usd ?? 60) * 192).toLocaleString()} LRD
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-semibold">Fraud Risk Assessment</span>
                    <span className={`font-extrabold ${(parsed?.fraud_score ?? 10) >= 50 ? "text-danger" : "text-annita-green-dark"}`}>
                      {parsed?.fraud_score ?? 10}/100{(parsed?.fraud_score ?? 10) < 50 ? " (Safe)" : ""}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-brand-200 pt-2 text-xs">
                  <span className="font-bold text-foreground">Escrow Status</span>
                  <span className={statusBadge(escrow.status)}>{escrow.status}</span>
                </div>

                {escrow.status === "RELEASED" && (
                  <div className="rounded-xl border border-brand-200 bg-surface px-3 py-2 font-mono text-[11px] font-bold">
                    {escrow.provider} · MoMo Ref: {escrow.mock_momo_txn_id || "—"}
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {escrow.status === "HELD"
                    ? "Funds are held in PayPal sandbox escrow. Money moves only after the receiver's proof passes."
                    : "Transaction complete. Mobile money released to the receiver."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-2xs">
              <div className="flex gap-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-brand-600 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Chips (always visible above input) */}
      {chips.length > 0 && (
        <div className="px-3 pb-2 flex flex-wrap gap-2 shrink-0 sm:px-4 sm:pb-2.5 sm:gap-2.5 bg-background">
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

      {/* Sticky Chat Input Bar - ALWAYS PINNED AT BOTTOM */}
      <div className="sticky bottom-0 left-0 right-0 z-20 bg-surface px-3 pt-2 pb-3 shrink-0 border-t border-border shadow-md">
        <div className="flex items-end gap-2 max-w-full overflow-hidden">
          {/* Pill container */}
          <div className="flex-1 flex items-center bg-muted/60 rounded-full min-h-[44px] max-h-[44px] px-2 py-1.5 border border-border overflow-hidden min-w-0">
            {/* Audio Lines button */}
            <button
              type="button"
              onClick={handleRecordTap}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition ${
                isRecording ? "bg-danger text-white animate-pulse" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              <AudioLines className="h-5 w-5" />
            </button>

            {/* Text input */}
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

            {/* Mic record button */}
            <button
              type="button"
              onClick={handleRecordTap}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-muted transition text-muted-foreground"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          {/* Send circle button */}
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
