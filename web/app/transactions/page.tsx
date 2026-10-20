"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  History,
  Home,
  Layers,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  TrendingUp,
  Wheat,
  Zap,
} from "lucide-react";
import { FEE_PCT_LABEL, USD_LRD, lrdOf, totalOf } from "../fx";
import { authHeaders, loadSession, type Session } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";

const TAG_OPTIONS = [
  { id: "ALL", label: "All Categories", icon: Layers },
  { id: "SCHOOL", label: "School", icon: GraduationCap },
  { id: "FOOD", label: "Food & Grocery", icon: Wheat },
  { id: "HEALTH", label: "Healthcare", icon: HeartPulse },
  { id: "RENT", label: "Rent & Housing", icon: Home },
  { id: "EMERGENCY", label: "Emergency", icon: Siren },
  { id: "GENERAL", label: "General", icon: Banknote },
];

function tagIcon(tagStr: string) {
  switch (tagStr.toUpperCase()) {
    case "SCHOOL":
      return GraduationCap;
    case "FOOD":
      return Wheat;
    case "HEALTH":
      return HeartPulse;
    case "RENT":
      return Home;
    case "EMERGENCY":
      return Siren;
    default:
      return Banknote;
  }
}

function downloadRemittanceSlipAsImage(escrowRecord: any, sessionName: string, sessionEmail: string) {
  if (!escrowRecord) return;
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const amount = escrowRecord.amount_usd || 60;
  const fee = escrowRecord.fee_usd || (amount * 0.02);
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

export default function TransactionsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/dashboard`);
      const j = await r.json();
      setRows(j.rows || []);
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s) {
        router.replace("/login?next=/transactions");
        return;
      }
      setSession(s);
      setLoading(false);
      void fetchTransactions();
    });
    return () => {
      alive = false;
    };
  }, [router, fetchTransactions]);

  function copyClaim(id: string) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/claim/${id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const filtered = rows.filter((r) => {
    if (selectedTag !== "ALL" && r.tag !== selectedTag) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.id.toLowerCase().includes(q) || (r.note || "").toLowerCase().includes(q) || (r.recipient || "").toLowerCase().includes(q);
    }
    return true;
  });

  const totalSpent = rows.reduce((acc, r) => acc + (r.amount_usd || 0), 0);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening Activity History…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 min-w-0">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Transaction History
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              <History className="size-3.5" /> Personal Activity
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete transaction history for your purpose-locked remittances, receipts, and claim links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void fetchTransactions()} className="btn btn-secondary btn-sm gap-1.5">
            <RefreshCw className="size-3.5" /> Refresh
          </button>
          <Link href="/" className="btn btn-primary btn-sm gap-1.5 font-bold">
            <Zap className="size-3.5" /> New Remittance
          </Link>
        </div>
      </div>

      {/* Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Remitted</span>
            <p className="text-2xl font-extrabold text-foreground mt-0.5">${totalSpent.toFixed(2)} USD</p>
            <p className="text-xs text-muted-foreground">≈ {lrdOf(totalSpent).toLocaleString()} LRD</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
            <DollarSign className="size-6" />
          </div>
        </div>

        <div className="card flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active Escrows</span>
            <p className="text-2xl font-extrabold text-brand-700 mt-0.5">
              {rows.filter((r) => r.status === "HELD").length} Escrows
            </p>
            <p className="text-xs text-muted-foreground">Awaiting bill proof upload</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xs">
            <Lock className="size-6" />
          </div>
        </div>

        <div className="card flex items-center justify-between p-5">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disbursed Local Payouts</span>
            <p className="text-2xl font-extrabold text-emerald-700 mt-0.5">
              {rows.filter((r) => r.status === "RELEASED").length} Settled
            </p>
            <p className="text-xs text-muted-foreground">Paid via Mobile Money &amp; Banks</p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
            <CheckCircle2 className="size-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions by recipient, purpose, ID..."
            className="input pl-10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto border-t border-border pt-3">
          {TAG_OPTIONS.map((t) => {
            const Icon = t.icon;
            const selected = selectedTag === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTag(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selected
                    ? "bg-brand-600 text-white shadow-2xs"
                    : "bg-surface border border-border text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-semibold">No transactions match your search.</p>
          </div>
        ) : (
          filtered.map((r) => {
            const TagIcon = tagIcon(r.tag || "GENERAL");
            return (
              <div key={r.id} className="card flex flex-col gap-3 border border-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                  <div>
                    <span className="font-mono text-sm font-extrabold text-foreground">{r.id}</span>
                    {r.note && <span className="text-xs text-muted-foreground ml-2">· {r.note}</span>}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                    {r.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-muted-foreground block font-bold">Transfer Amount</span>
                    <span className="font-extrabold text-foreground">${r.amount_usd}.00 USD</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-bold">Local Payout</span>
                    <span className="font-extrabold text-emerald-700">{lrdOf(r.amount_usd).toLocaleString()} LRD</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-bold">Purpose Lock</span>
                    <span className="font-extrabold text-brand-700 flex items-center gap-1">
                      <TagIcon className="size-3.5" /> {r.tag}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-bold">Disburse Provider</span>
                    <span className="font-extrabold text-foreground">{r.provider || "Pending Claim"}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyClaim(r.id)}
                      className="btn btn-secondary btn-sm gap-1 text-xs"
                    >
                      {copiedId === r.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      {copiedId === r.id ? "Copied" : "Copy Claim Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadRemittanceSlipAsImage(r, session?.name || "Sender", session?.email || "")}
                      className="btn btn-secondary btn-sm gap-1 text-xs"
                    >
                      <Download className="size-3.5" /> Download Image Slip
                    </button>
                  </div>

                  <Link href={`/escrow/${r.id}`} className="btn btn-ghost btn-sm gap-1 text-xs">
                    <ExternalLink className="size-3.5" /> Escrow Session Details
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
