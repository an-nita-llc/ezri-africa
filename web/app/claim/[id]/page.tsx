"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

  async function speak(t: string) {
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

  return (
    <main style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0B1220", color: "#F5F7FA", minHeight: "100vh", padding: 20, fontSize: 20 }}>
      <a href="#claim" style={{ position: "absolute", left: -9999 }}>Skip to claim form</a>
      <h1 style={{ marginBottom: 4 }}>Ezri Africa — Claim</h1>
      {error ? (
        <p role="alert">{error}</p>
      ) : !escrow ? (
        <p aria-live="polite">Loading…</p>
      ) : (
        <section id="claim" aria-label="claim form" style={{ border: "1px solid #334", borderRadius: 12, padding: 16, maxWidth: 560 }}>
          <p><b>${escrow.amount_usd}</b> for <b>{escrow.tag}</b>{escrow.note ? ` — ${escrow.note}` : ""}</p>
          <p>Status: <b>{escrow.status}</b></p>
          {escrow.status === "RELEASED" ? (
            <p role="status">Paid to {escrow.provider} {escrow.provider_number}. Ref: {escrow.mock_momo_txn_id} (MOCK in demo).</p>
          ) : escrow.status === "REFUNDED" || escrow.status === "EXPIRED" ? (
            <p role="status">This transfer is closed ({escrow.status}). Contact your sender.</p>
          ) : (
            <>
              <p>Step 1: pick where money goes. Step 2: photo your bill. Money moves only after approval.</p>
              <label style={{ display: "block", marginTop: 12 }}>Where should money go?
                <select value={provider} onChange={(e) => setProvider(e.target.value)} style={{ marginLeft: 8, padding: 14, fontSize: 20 }}>
                  <option>MTN</option><option>ORANGE</option>
                </select>
              </label>
              <label style={{ display: "block", marginTop: 12 }}>Mobile money number
                <input value={pnumber} onChange={(e) => setPnumber(e.target.value)} inputMode="tel" placeholder="0881234567"
                  style={{ display: "block", width: "100%", marginTop: 6, padding: 16, fontSize: 22, borderRadius: 10 }} />
              </label>
              <label style={{ display: "block", marginTop: 12 }}>Bill / quote / invoice photo (required)
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{ display: "block", marginTop: 6, fontSize: 18 }} />
              </label>
              <label style={{ display: "block", marginTop: 12 }}>What is this bill for?
                <input value={proofNote} onChange={(e) => setProofNote(e.target.value)} placeholder="school tuition invoice"
                  style={{ display: "block", width: "100%", marginTop: 6, padding: 14, fontSize: 20, borderRadius: 10 }} />
              </label>
              <button onClick={prove} style={{ marginTop: 16, padding: "18px 24px", fontSize: 22, background: "#2E7D32", color: "#fff", border: 0, borderRadius: 12, width: "100%" }}>
                Verify & Claim
              </button>
            </>
          )}
          {msg && <p aria-live="polite" style={{ marginTop: 12 }}>{msg}</p>}
        </section>
      )}
    </main>
  );
}
