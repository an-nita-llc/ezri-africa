"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TAGS = ["FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL"] as const;

type Msg = { from: "you" | "ai"; text: string };

export default function Page() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "ai", text: "Hi, I'm Ezri. Built for Africa, Liberia as pilot. Tell me: who and how much? e.g. Send $60 to mom for school" },
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
  const [big, setBig] = useState(false);
  const [contrast, setContrast] = useState(false);
  const [simple, setSimple] = useState(false);
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
    try { setQueued(JSON.parse(localStorage.getItem("ezri_outbox") || "[]")); } catch {}
    return () => { window.removeEventListener("online", go); window.removeEventListener("offline", go); };
  }, []);

  useEffect(() => { localStorage.setItem("ezri_outbox", JSON.stringify(queued)); }, [queued]);

  async function refresh(qq = q) {
    const r = await fetch(`${API}/api/dashboard?q=${encodeURIComponent(qq)}`);
    const j = await r.json();
    setRows(j.rows || []);
  }
  useEffect(() => { refresh(""); }, []);

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
    const r = await fetch(`${API}/api/chat/parse`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input, note: "" }),
    });
    const j = await r.json();
    setParsed(j);
    if (TAGS.includes(j.tag)) setTag(j.tag);
    say(`${j.lock_label}. $${j.amount_usd} ≈ ${j.fx_lrd} LRD. Fraud ${j.fraud_score}/100 — ${j.fraud_reason} Tap Hold & Pay.`);
  }

  async function holdPay() {
    const p = parsed || { amount_usd: 60, tag, note: input, recipient: "mom" };
    const r = await fetch(`${API}/api/escrow/create`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount_usd: p.amount_usd, tag: p.tag || tag, note: input, recipient: "mom" }),
    });
    const j = await r.json();
    setEscrow(j);
    say(`Held, not released. Escrow ${j.escrow_id}. PayPal order ${j.paypal_order_id}. Approve, then we capture and HOLD.`);
    if (j.approval_url) window.open(j.approval_url, "_blank", "noopener");
    const c = await fetch(`${API}/api/escrow/capture`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: j.escrow_id, paypal_order_id: j.paypal_order_id }),
    });
    const cj = await c.json();
    setEscrow({ ...j, status: cj.status, capture_id: cj.capture_id });
    say(`Captured and HELD. Prove-first now: receiver picks Orange or MTN + uploads bill photo.`);
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
    const r = await fetch(`${API}/api/escrow/prove`, { method: "POST", body: fd });
    const j = await r.json();
    setEscrow({ ...escrow, status: j.status });
    say(j.verdict === "PASS"
      ? `PASS — ${j.reason} MOCK MoMo ${j.mock_momo_txn_id} to ${provider} ${pnumber}.`
      : `FAIL — ${j.reason} Retry once, or sender overrides.`);
    refresh();
  }

  async function override() {
    const r = await fetch(`${API}/api/escrow/override`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: escrow.escrow_id, reason: "Sender trusts receiver" }),
    });
    const j = await r.json();
    setEscrow({ ...escrow, status: j.status });
    say("Sender override: released anyway. Human stays boss.");
    refresh();
  }

  async function refund() {
    const r = await fetch(`${API}/api/escrow/refund`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ escrow_id: escrow.escrow_id }),
    });
    const j = await r.json();
    setEscrow({ ...escrow, status: j.status });
    say(`Refunded via PayPal (${j.refund_id || "mock"}).`);
    refresh();
  }

  const style: React.CSSProperties = {
    fontSize: big ? 20 : 16,
    background: contrast ? "#000" : "#0B1220",
    color: "#F5F7FA",
    minHeight: "100vh",
    padding: 16,
  };

  return (
    <main style={style}>
      <a href="#chat" style={{ position: "absolute", left: -9999 }}>Skip to chat</a>
      <header>
        <h1 style={{ margin: "4px 0" }}>Ezri Africa</h1>
        <p style={{ margin: 0, opacity: 0.85 }}>
          Built for Africa, Liberia as pilot. PayPal in where PayPal can&apos;t receive locally — mobile money out (MOCK in demo).
          Talk. Lock. Prove. Prove-first always.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }} role="toolbar" aria-label="accessibility">
          <button onClick={mic} aria-label="speak instead of type">🎤 Speak</button>
          <button onClick={() => setBig(!big)} aria-label="toggle big text">Big text: {big ? "on" : "off"}</button>
          <button onClick={() => setContrast(!contrast)} aria-label="toggle high contrast">Contrast: {contrast ? "on" : "off"}</button>
          <button onClick={() => setSimple(!simple)} aria-label="toggle simple words">Simple words: {simple ? "on" : "off"}</button>
          <span aria-live="polite" style={{ opacity: 0.8 }}>{online ? "Online" : "Offline — queuing"} {queued.length ? `· Queued: ${queued.length}` : ""}</span>
        </div>
      </header>

      <section id="chat" aria-label="chat" ref={boxRef} style={{ border: "1px solid #334", borderRadius: 12, padding: 12, marginTop: 12, maxHeight: 300, overflow: "auto" }}>
        {msgs.map((m, i) => (
          <p key={i} style={{ background: m.from === "ai" ? "#16233B" : "#1E3A2B", padding: 10, borderRadius: 10 }}>
            <b>{m.from === "ai" ? "Ezri: " : "You: "}</b>{m.text}
          </p>
        ))}
      </section>

      <section aria-label="send box" style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <label htmlFor="msg" style={{ position: "absolute", left: -9999 }}>Type a message</label>
        <input id="msg" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && parse()}
          style={{ flex: 1, padding: 14, fontSize: big ? 20 : 16, borderRadius: 10 }} />
        <button onClick={parse} style={{ padding: "14px 18px", fontSize: big ? 20 : 16 }}>Send</button>
      </section>

      <section aria-label="lock and pay" style={{ border: "1px solid #334", borderRadius: 12, padding: 12, marginTop: 12 }}>
        <h2>Purpose lock + escrow</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TAGS.map((t) => (
            <button key={t} onClick={() => setTag(t)} aria-pressed={tag === t}
              style={{ padding: 10, background: tag === t ? "#2E7D32" : "#222", color: "#fff", borderRadius: 8 }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <button onClick={holdPay} style={{ padding: 14 }}>Hold & Pay (PayPal sandbox)</button>
          <button onClick={refund} disabled={!escrow}>Refund</button>
          <button onClick={override} disabled={!escrow}>Sender override</button>
        </div>
        {escrow && <p aria-live="polite">Escrow <b>{escrow.escrow_id}</b> — {escrow.status} · Order {escrow.paypal_order_id}</p>}
      </section>

      <section aria-label="prove first" style={{ border: "1px solid #334", borderRadius: 12, padding: 12, marginTop: 12 }}>
        <h2>Receiver: prove-first, then pick provider</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label>Provider
            <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ marginLeft: 6, padding: 10 }}>
              <option>MTN</option><option>ORANGE</option>
            </select>
          </label>
          <label>MoMo number
            <input value={pnumber} onChange={(e) => setPnumber(e.target.value)} inputMode="tel" style={{ marginLeft: 6, padding: 10 }} />
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          <label>Bill / invoice photo (required)
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ marginLeft: 6 }} />
          </label>
          <label>Proof note
            <input value={proofNote} onChange={(e) => setProofNote(e.target.value)} style={{ marginLeft: 6, padding: 10 }} />
          </label>
          <button onClick={prove} style={{ padding: 14 }}>Verify & Release</button>
        </div>
      </section>

      <section aria-label="dashboard" style={{ marginTop: 12 }}>
        <h2>Live ledger (AG Grid)</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='Try: risky, school, mom' aria-label="ask your ledger" style={{ flex: 1, padding: 10 }} />
          <button onClick={() => refresh()}>Ask</button>
        </div>
        <div className="ag-theme-quartz" style={{ height: 260 }}>
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
      </section>

      <footer style={{ opacity: 0.7, marginTop: 12 }}>
        <p>Demo: PayPal sandbox real when keys set, else MOCK. MoMo always MOCK in contest. Expiry 10 min in demo = 48h production.</p>
      </footer>
    </main>
  );
}
