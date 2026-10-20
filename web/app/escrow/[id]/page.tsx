"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  History,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import PayPalButtons from "@/app/PayPalButtons";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf, totalOf } from "@/app/fx";
import { authHeaders, loadSession, type Session } from "@/app/session";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";
const PP_CID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || "";

function downloadRemittanceSlipAsImage(escrowRecord: any, sessionName: string, sessionEmail: string) {
  if (!escrowRecord) return;
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const amount = escrowRecord.amount_usd || 60;
  const fee = escrowRecord.fee_usd || feeOf(amount);
  const total = amount + fee;
  const lrd = lrdOf(amount);
  const eid = escrowRecord.escrow_id || escrowRecord.id || "EZR-8F32A1";
  const tag = escrowRecord.tag || "SCHOOL";
  const note = escrowRecord.note || "Purpose-locked remittance";

  // Background
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, 600, 800);

  // Header Banner
  ctx.fillStyle = "#003868";
  ctx.fillRect(0, 0, 600, 140);

  // Accent Bar
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(0, 0, 600, 8);

  // Brand Name
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("EZRI AFRICA", 30, 48);

  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#d9e4f1";
  ctx.fillText("Official Remittance Escrow Receipt", 30, 72);

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#f26522";
  ctx.fillText(`SESSION: ${eid}`, 30, 105);

  // Status Badge
  ctx.fillStyle = "#00a651";
  ctx.fillRect(450, 40, 120, 32);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(escrowRecord.status || "HELD", 510, 60);
  ctx.textAlign = "left";

  // Main Card
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(30, 160, 540, 580, 16);
  ctx.fill();
  ctx.stroke();

  let y = 195;

  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("SENDER & PURPOSE DETAILS", 50, y);
  y += 24;

  ctx.fillStyle = "#0f172a";
  ctx.font = "13px sans-serif";
  ctx.fillText(`Sender Name: ${sessionName || "Demo Sender"}`, 50, y);
  y += 20;
  ctx.fillText(`Sender Email: ${sessionEmail || "demo@ezri.africa"}`, 50, y);
  y += 20;
  ctx.fillText(`Purpose Lock Tag: ${tag}`, 50, y);
  y += 20;
  ctx.fillText(`Note: ${note}`, 50, y);
  y += 30;

  // Divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.lineTo(550, y);
  ctx.stroke();
  y += 25;

  // Financials
  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("FINANCIAL BREAKDOWN", 50, y);
  y += 24;

  ctx.fillStyle = "#0f172a";
  ctx.font = "13px sans-serif";
  ctx.fillText(`Transfer Amount: $${amount.toFixed(2)} USD`, 50, y);
  y += 20;
  ctx.fillText(`Ezri Platform Fee (2%): $${fee.toFixed(2)} USD`, 50, y);
  y += 20;

  ctx.font = "bold 15px sans-serif";
  ctx.fillStyle = "#ea580c";
  ctx.fillText(`Total Charged to Sender: $${total.toFixed(2)} USD`, 50, y);
  y += 30;

  ctx.fillStyle = "#0b4d8f";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(`Exchange Rate: 1 USD = ${USD_LRD.toFixed(2)} LRD`, 50, y);
  y += 20;

  ctx.fillStyle = "#007a3d";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`Guaranteed Local Payout: ${lrd.toLocaleString()} LRD`, 50, y);
  y += 35;

  // Divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.moveTo(50, y);
  ctx.lineTo(550, y);
  ctx.stroke();
  y += 25;

  // Claim Instructions
  ctx.fillStyle = "#475569";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("RECEIVER CLAIM INSTRUCTIONS", 50, y);
  y += 24;

  ctx.fillStyle = "#0f172a";
  ctx.font = "12px monospace";
  ctx.fillText(`Claim Link: ${window.location.origin}/claim/${eid}`, 50, y);
  y += 24;

  ctx.font = "12px sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("1. Open claim link in any browser (Zero login required).", 50, y);
  y += 20;
  ctx.fillText("2. Select receiving provider (Mobile Money or Bank Wire).", 50, y);
  y += 20;
  ctx.fillText("3. Upload bill or receipt photo for deterministic proof inspection.", 50, y);
  y += 20;
  ctx.fillText("4. Payout is disbursed automatically upon proof PASS.", 50, y);

  // Footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Protected by PayPal Sandbox Escrow & deterministic proof guard", 300, 765);

  const link = document.createElement("a");
  link.download = `Ezri-Remittance-Receipt-${eid}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function EscrowDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [escrow, setEscrow] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [pin, setPin] = useState("");
  const [pinStage, setPinStage] = useState(false);
  const [pinError, setPinError] = useState("");

  const loadEscrowDetail = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/escrow/${id}`);
      if (!r.ok) {
        setEscrow({
          id,
          amount_usd: 60,
          tag: "SCHOOL",
          note: "Tuition fee remittance",
          status: "HELD",
          paypal_order_id: "PAYPAL-SANDBOX-DEMO",
        });
        return;
      }
      setEscrow(await r.json());
    } catch {
      setEscrow({
        id,
        amount_usd: 60,
        tag: "SCHOOL",
        note: "Tuition fee remittance",
        status: "HELD",
        paypal_order_id: "PAYPAL-SANDBOX-DEMO",
      });
    }
  }, [id]);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace(`/login?next=/escrow/${id}`);
        return;
      }
      setSession(s);
      setLoading(false);
      void loadEscrowDetail();
    });
    return () => {
      alive = false;
    };
  }, [id, router, loadEscrowDetail]);

  async function handleCapture() {
    if (!session || !escrow) return;
    const c = await fetch(`${API}/api/escrow/capture`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ escrow_id: id, paypal_order_id: escrow.paypal_order_id }),
    });
    const cj = await c.json();
    setEscrow((prev: any) => ({ ...prev, status: cj.status, capture_id: cj.capture_id }));
  }

  async function handleOverride() {
    if (!session) return;
    if (pin !== "1234") {
      setPinError("Wrong PIN. Demo PIN is 1234.");
      return;
    }
    setPinStage(false);
    setPin("");
    await fetch(`${API}/api/escrow/override`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ escrow_id: id, reason: "Sender manual override via Escrow Session detail" }),
    });
    void loadEscrowDetail();
  }

  async function handleRefund() {
    if (!session) return;
    await fetch(`${API}/api/escrow/refund`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ escrow_id: id }),
    });
    void loadEscrowDetail();
  }

  function copyClaim() {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/claim/${id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Escrow Session Details…</p>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="w-full py-12 px-4 text-center">
        <p className="text-base font-bold text-foreground">Escrow Session Not Found</p>
      </div>
    );
  }

  const amountUsd = escrow.amount_usd || 60;
  const feeUsd = escrow.fee_usd || feeOf(amountUsd);
  const totalUsd = amountUsd + feeUsd;
  const lrdPayout = lrdOf(amountUsd);

  return (
    <div className="w-full flex flex-col gap-6 py-2 min-w-0">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Escrow Session {escrow.id}
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              <ShieldCheck className="size-3.5" /> PayPal Sandbox Escrow
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            PayPal Order ID: {escrow.paypal_order_id || "PAYPAL-SANDBOX-DEMO"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadRemittanceSlipAsImage(escrow, session?.name || "Sender", session?.email || "")}
            className="btn btn-secondary btn-sm gap-1.5 font-bold"
          >
            <Download className="size-3.5" /> Download Image Slip
          </button>
          <Link href="/dashboard" className="btn btn-primary btn-sm gap-1.5">
            <History className="size-3.5" /> View Ledger
          </Link>
        </div>
      </div>

      {/* Main Status & Breakdown Card */}
      <div className="card flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[#003868] text-white shadow-xs">
              <Lock className="size-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Escrow Status</span>
              <p className="text-lg font-extrabold text-foreground">{escrow.status}</p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
            Purpose Tag: {escrow.tag}
          </span>
        </div>

        {/* Financial breakdown ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/40 p-4 rounded-2xl border border-border text-xs">
          <div>
            <span className="text-muted-foreground block font-bold">Transfer Amount</span>
            <span className="text-xl font-extrabold text-foreground">${amountUsd.toFixed(2)} USD</span>
          </div>
          <div>
            <span className="text-muted-foreground block font-bold">Ezri Fee ({FEE_PCT_LABEL}%)</span>
            <span className="text-xl font-extrabold text-brand-700">+${feeUsd.toFixed(2)} USD</span>
          </div>
          <div>
            <span className="text-muted-foreground block font-bold">Total Charged</span>
            <span className="text-xl font-extrabold text-foreground">${totalUsd.toFixed(2)} USD</span>
          </div>
          <div>
            <span className="text-muted-foreground block font-bold">Guaranteed Payout</span>
            <span className="text-xl font-extrabold text-emerald-700">{lrdPayout.toLocaleString()} LRD</span>
          </div>
        </div>

        {/* Receiver Claim Link Controls */}
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Receiver Claim Link (Zero Login Required)
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}/claim/${escrow.id}`}
              className="input font-mono text-xs bg-muted/30 flex-1"
            />
            <button
              type="button"
              onClick={copyClaim}
              className="btn btn-primary shrink-0 gap-1.5 btn-sm font-bold"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied" : "Copy Claim Link"}
            </button>
            <a
              href={`/claim/${escrow.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary shrink-0 gap-1.5 btn-sm font-bold"
            >
              <ExternalLink className="size-3.5" /> Open Claim Page
            </a>
          </div>
        </div>

        {/* Action Controls for Sender */}
        {(escrow.status === "HELD" || escrow.status === "NEEDS_RETRY") && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Sender Escrow Actions
            </span>

            {!pinStage ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPinStage(true)}
                  className="btn btn-primary btn-sm gap-1.5"
                >
                  <Zap className="size-3.5" /> Manual Disburse Override
                </button>
                <button
                  type="button"
                  onClick={() => void handleRefund()}
                  className="btn btn-danger-outline btn-sm gap-1.5"
                >
                  <RotateCcw className="size-3.5" /> Refund Escrow ($ {totalUsd.toFixed(2)})
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs">
                <label htmlFor="override-pin" className="font-bold text-amber-900">
                  Enter 4-digit Money PIN to approve manual override
                </label>
                <input
                  id="override-pin"
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/[^0-9]/g, ""));
                    setPinError("");
                  }}
                  placeholder="••••"
                  className="input font-mono font-bold text-center text-lg max-w-xs"
                />
                {pinError && <p className="text-xs font-bold text-danger">{pinError}</p>}
                <p className="text-[11px] text-amber-800">Demo PIN: 1234</p>

                <div className="flex gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => void handleOverride()}
                    className="btn btn-primary btn-sm gap-1"
                  >
                    Confirm PIN &amp; Override
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPinStage(false);
                      setPin("");
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
