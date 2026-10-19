"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  Building2,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Filter,
  GraduationCap,
  HeartPulse,
  History,
  Home,
  KeyRound,
  Layers,
  List,
  Lock,
  Pause,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Table,
  TrendingUp,
  Wallet,
  Wheat,
  Zap,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FEE_PCT_LABEL, USD_LRD, feeOf, lrdOf, totalOf } from "../fx";
import { authHeaders, loadSession, type Session } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type TimelineCompType = React.ComponentType<{ rows: any[]; onOpen?: (id: string) => void }>;
type TableCompType = React.ComponentType<{ rows: any[]; onOpen?: (id: string) => void }>;

const STATUS_LEGEND = [
  { status: "RELEASED", label: "Released", color: "green" },
  { status: "HELD", label: "Escrow Held", color: "amber" },
  { status: "NEEDS_RETRY", label: "Action Needed", color: "red" },
  { status: "REFUNDED", label: "Refunded", color: "gray" },
  { status: "EXPIRED", label: "Expired", color: "slate" },
];

const LEGEND_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
  gray: "bg-slate-400",
  slate: "bg-slate-400",
};

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

function statusPill(status: string) {
  switch (status) {
    case "RELEASED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-600/20 shadow-2xs">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Released
        </span>
      );
    case "HELD":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20 shadow-2xs">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Escrow Held
        </span>
      );
    case "NEEDS_RETRY":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-800 ring-1 ring-inset ring-rose-600/20 shadow-2xs">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Action Needed
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-500/20 shadow-2xs">
          <span className="size-1.5 rounded-full bg-slate-400" />
          Expired
        </span>
      );
    case "REFUNDED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-500/20 shadow-2xs">
          <span className="size-1.5 rounded-full bg-slate-400" />
          Refunded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-500/20 shadow-2xs">
          <span className="size-1.5 rounded-full bg-slate-400" />
          {status}
        </span>
      );
  }
}

function rowFee(amountUsd: number, feeUsd?: number): number {
  if (typeof feeUsd === "number" && feeUsd > 0) return feeUsd;
  return feeOf(amountUsd);
}

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
  const lrd = amount * 192;
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

  // Section 1: Sender & Purpose
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

  // Section 2: Financials
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
  ctx.fillText(`Exchange Rate: 1 USD = 192.00 LRD`, 50, y);
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

  // Section 3: Claim Instructions
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
  ctx.fillText("3. Upload bill or receipt photo for Vision AI inspection.", 50, y);
  y += 20;
  ctx.fillText("4. Payout is disbursed automatically upon AI PASS.", 50, y);

  // Footer
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Protected by PayPal Sandbox Escrow & OpenRouter AI Engine", 300, 765);

  const link = document.createElement("a");
  link.download = `Ezri-Remittance-Receipt-${eid}.png`;
  link.href = canvas.toDataURL("image/png");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedEscrow, setSelectedEscrow] = useState<any>(null);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmOverride, setConfirmOverride] = useState(false);
  const [pinStage, setPinStage] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [ledgerView, setLedgerView] = useState<"cards" | "table" | "timeline">("cards");

  const [TimelineComp, setTimelineComp] = useState<TimelineCompType | null>(null);
  const [TableComp, setTableComp] = useState<TableCompType | null>(null);

  useEffect(() => {
    if (ledgerView === "timeline" && !TimelineComp) {
      let alive = true;
      void import("@/components/ledger/escrow-timeline").then((m) => {
        if (alive) setTimelineComp(() => m.EscrowTimeline as any);
      });
      return () => {
        alive = false;
      };
    }
    if (ledgerView === "table" && !TableComp) {
      let alive = true;
      void import("@/components/ledger/ledger-table").then((m) => {
        if (alive) setTableComp(() => m.LedgerTable as any);
      });
      return () => {
        alive = false;
      };
    }
  }, [ledgerView, TimelineComp, TableComp]);

  function resetConfirmPins() {
    setPinStage(false);
    setPin("");
    setPinError("");
  }

  const fetchLedger = useCallback(
    async (qStr = searchQuery) => {
      try {
        const r = await fetch(`${API}/api/dashboard?q=${encodeURIComponent(qStr)}`);
        const j = await r.json();
        setRows(j.rows || []);
      } catch {}
    },
    [searchQuery]
  );

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
      void fetchLedger("");
    });
    return () => {
      alive = false;
    };
  }, [router, fetchLedger]);

  async function handleOverride() {
    if (!selectedEscrow || !session) return;
    if (pin !== "1234") {
      setPinError("Wrong PIN. Your demo PIN is 1234.");
      return;
    }
    resetConfirmPins();
    setConfirmOverride(false);
    await fetch(`${API}/api/escrow/override`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({
        escrow_id: selectedEscrow.id,
        reason: "Manual sender override via Fortune 500 dashboard",
      }),
    });
    void fetchLedger();
  }

  async function handleRefund() {
    if (!selectedEscrow || !session) return;
    if (pin !== "1234") {
      setPinError("Wrong PIN. Your demo PIN is 1234.");
      return;
    }
    resetConfirmPins();
    setConfirmRefund(false);
    await fetch(`${API}/api/escrow/refund`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ escrow_id: selectedEscrow.id }),
    });
    void fetchLedger();
  }

  function copyClaimLink(id: string) {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/claim/${id}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const filteredRows = rows.filter((r) => {
    if (selectedTag !== "ALL" && r.tag !== selectedTag) return false;
    if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
    return true;
  });

  const totalVolume = rows.reduce((acc, r) => acc + (r.amount_usd || 0), 0);
  const totalFees = rows.reduce((acc, r) => acc + rowFee(r.amount_usd, r.fee_usd), 0);
  const heldVolume = rows
    .filter((r) => r.status === "HELD")
    .reduce((acc, r) => acc + (r.amount_usd || 0), 0);
  const releasedCount = rows.filter((r) => r.status === "RELEASED").length;
  const actionNeededCount = rows.filter((r) => r.status === "NEEDS_RETRY").length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening Financial Ledger…</p>
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
              Transfers &amp; Escrow Ledger
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
              <ShieldCheck className="size-3.5" /> Audited Access
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Enterprise real-time tracking for purpose-locked remittance, risk scoring, and mobile money disburse.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void fetchLedger()}
            className="btn btn-secondary btn-sm gap-2"
          >
            <RefreshCw className="size-3.5" />
            Sync Ledger
          </button>
          <Link href="/" className="btn btn-primary btn-sm gap-2">
            <Zap className="size-3.5" />
            New Transfer
          </Link>
        </div>
      </div>

      {/* KPI Financial Summary Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Metric 1: Total Volume */}
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Volume</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <DollarSign className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">${totalVolume.toFixed(2)} USD</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ≈ {lrdOf(totalVolume).toLocaleString()} LRD · Ezri fee {FEE_PCT_LABEL}% = ${totalFees.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Metric 2: Held in Escrow */}
        <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">Held in Escrow</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xs">
              <Lock className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-brand-900">${heldVolume.toFixed(2)} USD</p>
            <p className="text-xs text-brand-700/80 mt-0.5">Awaiting verified photo proof</p>
          </div>
        </div>

        {/* Metric 3: Released Payouts */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Released Payouts</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-emerald-950">{releasedCount} Transfers</p>
            <p className="text-xs text-emerald-700/80 mt-0.5">Disbursed via Orange &amp; MTN</p>
          </div>
        </div>

        {/* Metric 4: Action Needed */}
        <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Action Needed</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-xs">
              <ShieldAlert className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-rose-950">{actionNeededCount} Flags</p>
            <p className="text-xs text-rose-700/80 mt-0.5">Retry or manual override available</p>
          </div>
        </div>
      </div>

      {/* Search & Vector Icon Category Filter Toolbar */}
      <div className="card flex flex-col gap-4 w-full">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <form
            className="flex-1 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void fetchLedger();
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger (e.g. 'risky', 'school', 'mom')..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary shrink-0">
              Search
            </button>
          </form>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {["ALL", "HELD", "RELEASED", "NEEDS_RETRY", "REFUNDED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  selectedStatus === st
                    ? "bg-annita-navy-900 text-white shadow-2xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {st === "ALL" ? "All Statuses" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Vector Icon Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border pt-3">
          <span className="text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
            Category:
          </span>
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

      {/* Ledger Cards View with PNG Image Receipt Download */}
      <div className="flex flex-col gap-3 w-full">
        {filteredRows.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-semibold">No transactions match your query.</p>
            <p className="mt-1 text-xs text-muted-foreground">Try resetting your filters or query terms.</p>
          </div>
        ) : (
          filteredRows.map((r) => {
            const TagIcon = tagIcon(r.tag || "GENERAL");
            return (
              <div key={r.id} className="card flex flex-col gap-3 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-extrabold text-foreground">{r.id}</p>
                    {r.note && <p className="max-w-md truncate text-xs text-muted-foreground">{r.note}</p>}
                  </div>
                  {statusPill(r.status)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 rounded-2xl bg-muted/40 p-3 text-xs">
                  <div>
                    <span className="block font-bold uppercase tracking-wider text-muted-foreground">Amount</span>
                    <span className="text-lg font-extrabold text-foreground">${r.amount_usd}.00 USD</span>
                  </div>
                  <div>
                    <span className="block font-bold uppercase tracking-wider text-muted-foreground">Payout</span>
                    <span className="text-lg font-extrabold text-foreground">{lrdOf(r.amount_usd).toLocaleString()} LRD</span>
                  </div>
                  <div>
                    <span className="block font-bold uppercase tracking-wider text-muted-foreground">Ezri fee ({FEE_PCT_LABEL}%)</span>
                    <span className="text-sm font-extrabold text-foreground">${rowFee(r.amount_usd, r.fee_usd).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="block font-bold uppercase tracking-wider text-muted-foreground">Sender charged</span>
                    <span className="text-sm font-extrabold text-foreground">${totalOf(r.amount_usd).toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 font-bold text-xs text-brand-700">
                      <TagIcon className="size-3.5 text-brand-600" />
                      {r.tag}
                    </span>
                    <span className="font-semibold text-xs text-foreground">{r.provider || "No provider yet"}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyClaimLink(r.id)}
                      className="btn btn-secondary btn-sm gap-1"
                    >
                      {copiedId === r.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                      {copiedId === r.id ? "Copied" : "Copy Claim Link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadRemittanceSlipAsImage(r, session?.name || "Sender", session?.email || "")}
                      className="btn btn-secondary btn-sm gap-1"
                      title="Download PNG Image Receipt"
                    >
                      <Download className="size-3.5" /> Download Image Slip
                    </button>
                    <a
                      href={`/claim/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm gap-1"
                    >
                      <ExternalLink className="size-3.5" /> Open Claim
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
