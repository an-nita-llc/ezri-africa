"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BadgeCheck, AlertCircle } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ClaimPage() {
  const params = useParams();
  const id = String(params.id || "");
  const [escrow, setEscrow] = useState<any>(null);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("MTN");
  const [pnumber, setPnumber] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("Loading your transfer…");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/escrow/${id}`);
      if (!r.ok) return setError("Link not found. Ask the sender for a fresh link.");
      setEscrow(await r.json());
      setMsg("");
    } catch {
      setError("No connection. Reconnect and reopen this link.");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  function speak(t: string) {
    setMsg(t);
    try {
      const u = new SpeechSynthesisUtterance(t.split(".")[0]);
      u.lang = "en-US";
      window.speechSynthesis?.speak(u);
    } catch {}
  }

  async function prove() {
    if (!file) return speak("Pick a photo of your bill first. Proof comes before payout.");
    if (!pnumber.trim()) return speak("Type your mobile money number first.");
    const fd = new FormData();
    fd.append("escrow_id", id);
    fd.append("provider", provider);
    fd.append("provider_number", pnumber.trim());
    fd.append("note", proofNote);
    fd.append("proof", file);
    try {
      const r = await fetch(`${API}/api/escrow/prove`, { method: "POST", body: fd });
      const j = await r.json();
      await load();
      speak(j.verdict === "PASS"
        ? `Approved. Mobile money is on its way to ${provider} ${pnumber}.`
        : `Not approved. ${j.reason || "Try a clearer photo."} You can retry once.`);
    } catch {
      speak("Send failed. Check connection and retry.");
    }
  }

  if (error) {
    return (
      <div role="alert" className="card flex items-start gap-3 border-danger/30 bg-danger/10 text-sm text-danger">
        <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!escrow) {
    return <p aria-live="polite" className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <section aria-label="Claim form" className="card mx-auto flex w-full max-w-xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-annita-navy-900">Claim your transfer</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          <b className="text-foreground">${escrow.amount_usd}</b> for <b className="text-foreground">{escrow.tag}</b>
          {escrow.note ? ` — ${escrow.note}` : ""}
        </p>
        <p className="mt-2 text-sm">Status: <b>{escrow.status}</b></p>
      </div>

      {escrow.status === "RELEASED" ? (
        <p role="status" className="flex items-start gap-3 rounded-xl bg-annita-green/10 px-4 py-3 text-sm text-annita-green-dark">
          <BadgeCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>Paid to {escrow.provider} {escrow.provider_number}. Ref: <span className="font-mono">{escrow.mock_momo_txn_id}</span> (MOCK in demo).</span>
        </p>
      ) : escrow.status === "REFUNDED" || escrow.status === "EXPIRED" ? (
        <p role="status" className="text-sm text-muted-foreground">This transfer is closed ({escrow.status}). Contact your sender.</p>
      ) : (
        <>
          <p className="text-sm leading-6 text-muted-foreground">Step 1: pick where money goes. Step 2: photo your bill. Money moves only after approval.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cprovider" className="label">Where should money go?</label>
            <select id="cprovider" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option>MTN</option>
              <option>ORANGE</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cnumber" className="label">Mobile money number</label>
            <input id="cnumber" value={pnumber} onChange={(e) => setPnumber(e.target.value)} inputMode="tel" placeholder="0881234567" className="input font-mono" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cphoto" className="label">Bill / quote / invoice photo (required)</label>
            <input id="cphoto" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cnote" className="label">What is this bill for?</label>
            <input id="cnote" value={proofNote} onChange={(e) => setProofNote(e.target.value)} placeholder="school tuition invoice" className="input" />
          </div>
          <button type="button" onClick={() => { void prove(); }} className="btn btn-primary btn-lg btn-block">Verify & Claim</button>
        </>
      )}
      {msg && <p aria-live="polite" className="text-sm text-muted-foreground">{msg}</p>}
    </section>
  );
}
