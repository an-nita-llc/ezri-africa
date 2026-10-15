"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { Mic, Contrast, Type, Languages, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import PayPalButtons from "./PayPalButtons";
import { authHeaders, clearSession, loadSession, type Session } from "./session";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const PP_CID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";
const TAGS = ["FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL"] as const;

type Msg = { from: "you" | "ai"; text: string };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function statusBadge(status: string) {
  const base = "badge ";
  if (status === "RELEASED") return `${base}bg-annita-green/10 text-annita-green-dark`;
  if (status === "HELD") return `${base}bg-brand-100 text-brand-800`;
  if (status === "NEEDS_RETRY" || status === "EXPIRED") return `${base}bg-danger/10 text-danger`;
  if (status === "REFUNDED") return `${base}bg-muted text-muted-foreground`;
  return `${base}bg-muted text-muted-foreground`;
}

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "ai", text: "Hi, I'm Ezri. Built for Africa. Tell me: who and how much? e.g. Send $60 to mom for school" },
  ]);
  const [input, setInput] = useState("Send $60 to mom for school, lock it");
  const [tag, setTag] = useState<string>("SCHOOL");
  const [parsed, setParsed] = useState<any>(null);
  const [escrow, setEscrow] = useState<any>(null);
  const [provider, setProvider] = useState("MTN");
  const [pnumber, setPnumber] = useState("0881234567");
  const [file, setFile] = useState<File | null>(null);
  const [proofNote, setProofNote] = useState("school tuition invoice");
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [queued, setQueued] = useState<any[]>([]);
  const [online, setOnline] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [simple, setSimple] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [copied, setCopied] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const say = useCallback((t: string) => {
    setMsgs((m) => [...m, { from: "ai", text: t }]);
    try {
      const u = new SpeechSynthesisUtterance(simple ? t.split(".")[0] : t);
      u.lang = "en-US";
      window.speechSynthesis?.speak(u);
    } catch {}
  }, [simple]);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: 99999 });
    const go = () => setOnline(navigator.onLine);
    window.addEventListener("online", go);
    window.addEventListener("offline", go);
    setOnline(navigator.onLine);
    try { void idbGet("ezri_outbox").then((v) => { if (Array.isArray(v)) setQueued(v); }).catch(() => {}); } catch {}
    void loadSession().then(setSession);
    return () => { window.removeEventListener("online", go); window.removeEventListener("offline", go); };
  }, []);

  useEffect(() => { void idbSet("ezri_outbox", queued).catch(() => {}); }, [queued]);

  async function refresh(qq = q) {
    try {
      const r = await fetch(`${API}/api/dashboard?q=${encodeURIComponent(qq)}`);
      const j = await r.json();
      setRows(j.rows || []);
    } catch {}
  }
  useEffect(() => { void refresh(""); }, []);

  function mic() {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return say("Voice not supported here. Type instead — big buttons still work.");
    const rec = new SR();
    rec.lang = "en-US";
    rec.onresult = (e: any) => setInput(e.results[0][0].transcript);
    rec.start();
    say("Listening. Speak now.");
  }

  async function parse() {
    setMsgs((m) => [...m, { from: "you", text: input }]);
    if (!navigator.onLine) {
      setQueued((qq) => [...qq, { text: input, at: Date.now() }]);
      return say("You're offline. Saved. It will send when you're back online.");
    }
    try {
      const r = await fetch(`${API}/api/chat/parse`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input, note: "" }),
      });
      const j = await r.json();
      setParsed(j);
      if ((TAGS as readonly string[]).includes(j.tag)) setTag(j.tag);
      say(`${j.lock_label}. $${j.amount_usd} ≈ ${j.fx_lrd} LRD. Fraud ${j.fraud_score}/100 — ${j.fraud_reason} Tap Hold & Pay.`);
    } catch {
      say("No connection. Your message is queued.");
    }
  }

  async function captureNow(eid: string, oid: string) {
    const c = await fetch(`${API}/api/escrow/capture`, {
      method: "POST", headers: session ? authHeaders(session.token) : { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: eid, paypal_order_id: oid }),
    });
    const cj = await c.json();
    setEscrow((e: any) => ({ ...e, status: cj.status, capture_id: cj.capture_id }));
    say(`Captured and HELD. Prove-first now: receiver picks Orange or MTN + uploads bill photo.`);
    refresh();
  }

  async function holdPay() {
    if (!session) {
      say("Log in first — one tap with demo login. Then Hold & Pay.");
      return;
    }
    const p = parsed || { amount_usd: 60, tag, note: input, recipient: "mom" };
    const r = await fetch(`${API}/api/escrow/create`, {
      method: "POST", headers: authHeaders(session.token),
      body: JSON.stringify({ amount_usd: p.amount_usd, tag: p.tag || tag, note: input, recipient: "mom" }),
    });
    const j = await r.json();
    setEscrow(j);
    if (String(j.paypal_order_id || "").startsWith("MOCK-")) {
      say(`Held, not released. Escrow ${j.escrow_id}. Mock PayPal order — capturing now.`);
      await captureNow(j.escrow_id, j.paypal_order_id);
      return;
    }
    say(`Order ${j.paypal_order_id} created. Approve in the PayPal button below, then we capture and HOLD.`);
    refresh();
  }

  async function prove() {
    if (!escrow?.escrow_id) return say("Hold & Pay first.");
    if (!file) return say("Pick a bill photo first — prove-first always.");
    const fd = new FormData();
    fd.append("escrow_id", escrow.escrow_id);
    fd.append("provider", provider);
    fd.append("provider_number", pnumber);
    fd.append("note", proofNote);
    fd.append("proof", file);
    try {
      const r = await fetch(`${API}/api/escrow/prove`, { method: "POST", body: fd });
      const j = await r.json();
      setEscrow({ ...escrow, status: j.status });
      say(j.verdict === "PASS"
        ? `PASS — ${j.reason} MOCK MoMo ${j.mock_momo_txn_id} to ${provider} ${pnumber}.`
        : `FAIL — ${j.reason} Retry once, or sender overrides.`);
      refresh();
    } catch {
      say("Send failed. Check connection and retry.");
    }
  }

  async function doOverride() {
    setConfirmOverride(false);
    const r = await fetch(`${API}/api/escrow/override`, {
      method: "POST", headers: session ? authHeaders(session.token) : { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: escrow.escrow_id, reason: "Sender trusts receiver" }),
    });
    const j = await r.json();
    setEscrow({ ...escrow, status: j.status });
    say("Sender override: released anyway. Human stays boss.");
    refresh();
  }

  async function doRefund() {
    setConfirmRefund(false);
    const r = await fetch(`${API}/api/escrow/refund`, {
      method: "POST", headers: session ? authHeaders(session.token) : { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: escrow.escrow_id }),
    });
    const j = await r.json();
    setEscrow({ ...escrow, status: j.status });
    say(`Refunded via PayPal (${j.refund_id || "mock"}).`);
    refresh();
  }

  function copyClaim() {
    const url = `${window.location.origin}/claim/${escrow.escrow_id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      say(`Claim link copied: ${url}`);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => say(url));
  }

  return (
    <div className={`${big ? "ezri-big" : ""} ${contrast ? "ezri-contrast" : ""} flex flex-col gap-6`}>
      <div>
        <p className="text-sm text-muted-foreground">{greeting()}{session ? `, ${session.name}` : ""}</p>
        <h1 className="text-2xl font-bold tracking-tight text-annita-navy-900">
          Send protected money
        </h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Built for Africa. PayPal in where PayPal can&apos;t receive locally — mobile money out.
          Talk. Lock. Prove. Prove-first always.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Accessibility">
          <button type="button" onClick={mic} className="btn btn-secondary btn-sm"><Mic aria-hidden="true" className="size-4" /> Speak</button>
          <button type="button" onClick={() => setBig(!big)} aria-pressed={big} className="btn btn-secondary btn-sm"><Type aria-hidden="true" className="size-4" /> Big text</button>
          <button type="button" onClick={() => setContrast(!contrast)} aria-pressed={contrast} className="btn btn-secondary btn-sm"><Contrast aria-hidden="true" className="size-4" /> Contrast</button>
          <button type="button" onClick={() => setSimple(!simple)} aria-pressed={simple} className="btn btn-secondary btn-sm"><Languages aria-hidden="true" className="size-4" /> Simple words</button>
          <span aria-live="polite" className="text-xs text-muted-foreground">
            {online ? "Online" : "Offline — queuing"}{queued.length ? ` · Queued: ${queued.length}` : ""}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {session ? (
              <>Signed in as <b>{session.email}</b> <button type="button" onClick={() => { void clearSession().then(() => setSession(null)); }} className="btn btn-ghost btn-sm">Log out</button></>
            ) : (
              <><a href="/login" className="btn btn-ghost btn-sm">Log in</a><a href="/signup" className="btn btn-ghost btn-sm">Sign up</a></>
            )}
          </span>
        </div>
      </div>

      <section aria-label="Chat" className="card">
        <div ref={boxRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto" role="log" aria-label="Conversation">
          {msgs.map((m, i) => (
            <p key={i} className={`rounded-xl px-4 py-3 text-sm leading-6 ${m.from === "ai" ? "bg-muted text-foreground" : "bg-annita-navy-800 text-white"}`}>
              <b>{m.from === "ai" ? "Ezri: " : "You: "}</b>{m.text}
            </p>
          ))}
        </div>
        <form
          id="send"
          className="mt-3 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); void parse(); }}
        >
          <label htmlFor="msg" className="sr-only">Type a message</label>
          <input
            id="msg"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send $60 to mom for school, lock it"
            className="input"
          />
          <button type="submit" className="btn btn-primary shrink-0">Send</button>
        </form>
      </section>

      <section aria-label="Purpose lock and escrow" className="card flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-annita-navy-900">Purpose lock + escrow</h2>
          <p className="hint">Money is held, never released, until proof passes.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Purpose tags">
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              aria-pressed={tag === t}
              className={`btn btn-sm ${tag === t ? "btn-primary" : "btn-secondary"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => { void holdPay(); }} className="btn btn-primary btn-block sm:w-auto">Hold & Pay (PayPal sandbox)</button>
          <button type="button" onClick={() => setConfirmRefund(true)} disabled={!escrow} className="btn btn-danger-outline">Refund</button>
          <button type="button" onClick={() => setConfirmOverride(true)} disabled={!escrow} className="btn btn-secondary">Sender override</button>
        </div>
        {escrow && (
          <div className="flex flex-col gap-2 rounded-xl bg-muted px-4 py-3 text-sm">
            <p>
              Escrow <b className="font-mono">{escrow.escrow_id}</b>{" "}
              <span className={statusBadge(escrow.status)}>{escrow.status}</span>{" "}
              <span className="text-muted-foreground">Order {escrow.paypal_order_id}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              Receiver claim link (no login): <code className="font-mono">/claim/{escrow.escrow_id}</code>
              <button type="button" onClick={copyClaim} className="btn btn-secondary btn-sm">
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </p>
          </div>
        )}
        {escrow && escrow.status === "DRAFT" && (
          <>
            <PayPalButtons orderId={escrow.paypal_order_id} clientId={PP_CID} onApproved={() => { void captureNow(escrow.escrow_id, escrow.paypal_order_id); }} />
            {escrow.approval_url && (
              <p className="text-sm"><a href={escrow.approval_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-700 hover:underline">Approve in PayPal (new tab fallback)</a></p>
            )}
          </>
        )}
      </section>

      <section aria-label="Prove first" className="card flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-annita-navy-900">Receiver: prove-first, then pick provider</h2>
          <p className="hint">Upload the bill before money moves. Always.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="provider" className="label">Provider</label>
            <select id="provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option>MTN</option>
              <option>ORANGE</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pnumber" className="label">MoMo number</label>
            <input id="pnumber" value={pnumber} onChange={(e) => setPnumber(e.target.value)} inputMode="tel" className="input font-mono" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="proof" className="label">Bill / invoice photo (required)</label>
          <input id="proof" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="proofnote" className="label">Proof note</label>
          <input id="proofnote" value={proofNote} onChange={(e) => setProofNote(e.target.value)} className="input" />
        </div>
        <button type="button" onClick={() => { void prove(); }} className="btn btn-primary btn-lg btn-block sm:w-auto">Verify & Release</button>
      </section>

      <section aria-label="Live ledger" id="ledger" className="card flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-annita-navy-900">Live ledger</h2>
          <p className="hint">Ask in plain words. Try: risky, school, mom.</p>
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void refresh(); }}>
          <label htmlFor="ask" className="sr-only">Ask your ledger</label>
          <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try: risky, school, mom" className="input" />
          <button type="submit" className="btn btn-secondary shrink-0">Ask</button>
        </form>
        <div className="ag-theme-quartz h-64">
          <AgGridReact
            rowData={rows}
            columnDefs={[
              { field: "id", headerName: "Escrow", flex: 1 },
              { field: "tag", width: 110 },
              { field: "amount_usd", headerName: "$", width: 80 },
              { field: "status", width: 130 },
              { field: "provider", width: 100 },
              { field: "mock_momo_txn_id", headerName: "MoMo (MOCK)", flex: 1 },
            ]}
          />
        </div>
        <p className="hint">Demo: PayPal sandbox real when keys set, else MOCK. MoMo always MOCK in contest. Expiry 10 min in demo = 48h production.</p>
      </section>

      <Modal
        open={confirmRefund}
        onClose={() => setConfirmRefund(false)}
        title="Refund this transfer?"
        description="The PayPal capture will be refunded to the sender. This cannot be undone."
        actions={
          <>
            <button type="button" onClick={() => setConfirmRefund(false)} className="btn btn-secondary btn-block sm:w-auto">Keep holding</button>
            <button type="button" onClick={() => { void doRefund(); }} className="btn btn-danger btn-block sm:w-auto">Yes, refund</button>
          </>
        }
      />
      <Modal
        open={confirmOverride}
        onClose={() => setConfirmOverride(false)}
        title="Release despite FAIL?"
        description="The AI check did not pass. Releasing anyway records a sender override on the ledger."
        actions={
          <>
            <button type="button" onClick={() => setConfirmOverride(false)} className="btn btn-secondary btn-block sm:w-auto">Keep holding</button>
            <button type="button" onClick={() => { void doOverride(); }} className="btn btn-primary btn-block sm:w-auto">Release anyway</button>
          </>
        }
      />
    </div>
  );
}
