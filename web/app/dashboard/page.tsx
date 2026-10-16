"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  CalendarRange,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  Filter,
  History,
  List,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { FEE_PCT_LABEL, feeOf, lrdOf, totalOf } from "../fx";
import { authHeaders, loadSession, type Session } from "../session";
import { buildTimelineModel, STATUS_LEGEND } from "./timeline-model";

const EscrowTimeline = dynamic(
  () =>
    import("@/components/ledger/escrow-timeline").then((m) => m.EscrowTimeline),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-sm font-semibold text-muted-foreground">
        Opening escrow timeline…
      </p>
    ),
  }
);

const LedgerTableView = dynamic(
  () =>
    import("@/components/ledger/ledger-table").then((m) => m.LedgerTable),
  {
    ssr: false,
    loading: () => (
      <p className="py-16 text-center text-sm font-semibold text-muted-foreground">
        Opening transfers table…
      </p>
    ),
  }
);

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Row fee: stored value for new rows, 2% fallback for seeds created before the fee column. */
const rowFee = (amountUsd: number, feeUsd?: number) =>
  Number(feeUsd) > 0 ? Number(feeUsd) : feeOf(Number(amountUsd) || 0);

const TAG_OPTIONS = [  { id: "ALL", label: "All Categories" },
  { id: "SCHOOL", label: "School 🎓" },
  { id: "FOOD", label: "Food 🌾" },
  { id: "HEALTH", label: "Health 🏥" },
  { id: "RENT", label: "Rent 🏠" },
  { id: "EMERGENCY", label: "Emergency 🚨" },
  { id: "GENERAL", label: "General 💵" },
];

/** Legend dots in the app palette (Bryntum event colors are theme-internal). */
const LEGEND_DOT: Record<string, string> = {
  gray: "bg-slate-400",
  orange: "bg-amber-500",
  red: "bg-rose-500",
  green: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-sky-500",
};

function statusPill(status: string) {
  switch (status) {
    case "RELEASED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Released
        </span>
      );
    case "HELD":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Escrow Held
        </span>
      );
    case "NEEDS_RETRY":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-600/20">
          <span className="size-1.5 rounded-full bg-rose-500" />
          Action Needed
        </span>
      );
    case "EXPIRED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          Expired
        </span>
      );
    case "REFUNDED":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          Refunded
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-inset ring-border">
          <span className="size-1.5 rounded-full bg-muted-foreground/60" />
          {status}
        </span>
      );
  }
}

/** Inline 4-digit PIN step — the agent never executes without it (demo PIN 1234). */
function PinEntry({
  pin,
  pinError,
  onPinChange,
  onBack,
  onConfirm,
  confirmLabel,
  confirmClass,
}: {
  pin: string;
  pinError: string;
  onPinChange: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmClass: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          value={pin}
          onChange={(event) => onPinChange(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          placeholder="••••"
          aria-label="4-digit money PIN"
          className="input w-28 min-h-9 text-center text-base font-bold tracking-[0.4em]"
        />
        <span className="text-xs font-semibold text-muted-foreground">Demo PIN: 1234</span>
      </div>
      {pinError ? <p className="text-xs font-bold text-danger">{pinError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onBack} className="btn btn-secondary btn-sm">
          Back
        </button>
        <button type="button" onClick={onConfirm} className={`${confirmClass} btn-sm gap-1`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
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
  const [ledgerView, setLedgerView] = useState<"cards" | "table" | "timeline">(
    "cards"
  );
  const [highlightId, setHighlightId] = useState<string | null>(null);

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

  // Filtered Rows Calculation
  const filteredRows = rows.filter((r) => {
    if (selectedTag !== "ALL" && r.tag !== selectedTag) return false;
    if (selectedStatus !== "ALL" && r.status !== selectedStatus) return false;
    return true;
  });

  // Jump from the table/timeline into a transfer's action card.
  function openEscrow(id: string) {
    setLedgerView("cards");
    setHighlightId(id);
    window.setTimeout(() => {
      document
        .getElementById(`escrow-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
  }

  const timelineModel = useMemo(
    () => buildTimelineModel(filteredRows),
    [filteredRows]
  );

  // Financial Metrics Calculation
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
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Transfers & Escrow Ledger
            </h1>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              Audited Access
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              ≈ {lrdOf(totalVolume).toLocaleString()} LRD · Ezri fee {FEE_PCT_LABEL}% = $
              {totalFees.toFixed(2)}
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
            <p className="text-xs text-emerald-700/80 mt-0.5">Disbursed via Orange & MTN</p>
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

      {/* Natural Language Search & Filter Toolbar */}
      <div className="card flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          {/* Search Box */}
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
                placeholder="Ask or search ledger (e.g. 'risky', 'school', 'mom', 'Orange')..."
                className="input pl-10"
              />
            </div>
            <button type="submit" className="btn btn-primary shrink-0">
              Search
            </button>
          </form>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
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

        {/* Category Tag Selector */}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <span className="text-xs font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
            Category:
          </span>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTag(t.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                selectedTag === t.id
                  ? "bg-brand-600 text-white shadow-2xs"
                  : "bg-surface border border-border text-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger views: action cards · AG Grid table · Bryntum escrow timeline */}
      <div
        role="tablist"
        aria-label="Ledger views"
        className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1"
      >
        {(
          [
            { id: "cards", label: "Cards", icon: List },
            { id: "table", label: "Table", icon: Table },
            { id: "timeline", label: "Timeline", icon: CalendarRange },
          ] as const
        ).map((v) => {
          const Icon = v.icon;
          const active = ledgerView === v.id;
          return (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setLedgerView(v.id)}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all ${
                active
                  ? "bg-surface text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{v.label}</span>
            </button>
          );
        })}
      </div>

      {ledgerView === "table" ? (
        <LedgerTableView rows={filteredRows} onOpen={openEscrow} />
      ) : ledgerView === "timeline" ? (
        <div className="card flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <h2 className="text-sm font-extrabold text-foreground">
              Escrow timeline — money against the refund clock
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_LEGEND.map((l) => (
                <span
                  key={l.status}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className={`size-2.5 rounded-full ${LEGEND_DOT[l.color] ?? "bg-slate-400"}`}
                  />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          {filteredRows.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="text-sm font-semibold">No transactions match your query.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try resetting your filters or query terms.
              </p>
            </div>
          ) : (
            <EscrowTimeline
              resources={timelineModel.resources}
              events={timelineModel.events}
              startDate={timelineModel.startDate}
              endDate={timelineModel.endDate}
            />
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Each bar runs from creation to its refund deadline inside its purpose
            lane. Powered by Bryntum Scheduler (trial).
          </p>
        </div>
      ) : (
      <div className="flex flex-col gap-3">
        {/* Vertical transfer list — everything on the page, up/down scroll only */}
        {filteredRows.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-semibold">No transactions match your query.</p>
            <p className="mt-1 text-xs text-muted-foreground">Try resetting your filters or query terms.</p>
          </div>
        ) : (
          filteredRows.map((r) => (
            <div
              key={r.id}
              id={`escrow-${r.id}`}
              className={`card flex scroll-mt-20 flex-col gap-3 transition-shadow ${
                highlightId === r.id ? "ring-2 ring-brand-500" : ""
              }`}
            >
              {/* Row 1: escrow id + status */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-sm font-extrabold text-foreground">{r.id}</p>
                  {r.note && (
                    <p className="max-w-md truncate text-xs text-muted-foreground">{r.note}</p>
                  )}
                </div>
                {statusPill(r.status)}
              </div>

              {/* Row 2: amounts stacked on the page */}
              <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 rounded-2xl bg-muted/40 p-3 text-xs">
                <div>
                  <span className="block font-bold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </span>
                  <span className="text-lg font-extrabold text-foreground">
                    ${r.amount_usd}.00 USD
                  </span>
                </div>
                <div>
                  <span className="block font-bold uppercase tracking-wider text-muted-foreground">
                    Payout
                  </span>
                  <span className="text-lg font-extrabold text-foreground">
                    {lrdOf(r.amount_usd).toLocaleString()} LRD
                  </span>
                </div>
                <div>
                  <span className="block font-bold uppercase tracking-wider text-muted-foreground">
                    Ezri fee ({FEE_PCT_LABEL}%)
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    ${rowFee(r.amount_usd, r.fee_usd).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="block font-bold uppercase tracking-wider text-muted-foreground">
                    Sender charged
                  </span>
                  <span className="text-sm font-extrabold text-foreground">
                    ${totalOf(r.amount_usd).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Row 3: meta */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-bold text-brand-700">
                  {r.tag}
                </span>
                <span className="font-semibold text-foreground">{r.provider || "No provider yet"}</span>
                {r.mock_momo_txn_id && (
                  <span className="font-mono text-muted-foreground">{r.mock_momo_txn_id}</span>
                )}
              </div>

              {/* Row 4: actions */}
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => copyClaimLink(r.id)}
                  className="btn btn-secondary btn-sm gap-1"
                >
                  {copiedId === r.id ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedId === r.id ? "Copied" : "Copy Claim Link"}
                </button>
                <a
                  href={`/claim/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm gap-1"
                >
                  <ExternalLink className="size-3.5" /> Open Claim
                </a>
                {r.status === "NEEDS_RETRY" || r.status === "HELD" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEscrow(r);
                        setConfirmOverride(true);
                        setConfirmRefund(false);
                        resetConfirmPins();
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Override AI
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEscrow(r);
                        setConfirmRefund(true);
                        setConfirmOverride(false);
                        resetConfirmPins();
                      }}
                      className="btn btn-danger-outline btn-sm"
                    >
                      Refund
                    </button>
                  </>
                ) : null}
              </div>

              {/* Inline confirmations — on the page, no popups.
                  Two stages: approval first, then 4-digit PIN (demo 1234). */}
              {selectedEscrow?.id === r.id && confirmOverride && (
                <div className="flex flex-col gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-4 text-xs">
                  <p className="font-bold text-foreground">
                    Override AI &amp; disburse mobile money for {r.id}? The manual
                    override is recorded on the ledger.
                  </p>
                  {!pinStage ? (
                    <>
                      <p className="text-xs leading-4 text-muted-foreground">
                        The agent pauses here — nothing executes until you approve and enter your PIN.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmOverride(false);
                            resetConfirmPins();
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setPinStage(true)}
                          className="btn btn-primary btn-sm gap-1"
                        >
                          <ShieldAlert className="size-3.5" /> Approve &amp; enter PIN
                        </button>
                      </div>
                    </>
                  ) : (
                    <PinEntry
                      pin={pin}
                      pinError={pinError}
                      onPinChange={(v) => {
                        setPin(v);
                        setPinError("");
                      }}
                      onBack={() => {
                        setPinStage(false);
                        setPin("");
                        setPinError("");
                      }}
                      onConfirm={() => void handleOverride()}
                      confirmLabel="Confirm Override &amp; Disburse"
                      confirmClass="btn btn-primary"
                    />
                  )}
                </div>
              )}
              {selectedEscrow?.id === r.id && confirmRefund && (
                <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-xs">
                  <p className="font-bold text-danger">
                    Refund the PayPal escrow capture for {r.id}? Captured funds
                    return to the sender&apos;s PayPal account.
                  </p>
                  {!pinStage ? (
                    <>
                      <p className="text-xs leading-4 text-danger/80">
                        The agent pauses here — no refund runs until you approve and enter your PIN.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmRefund(false);
                            resetConfirmPins();
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => setPinStage(true)}
                          className="btn btn-primary btn-sm gap-1"
                        >
                          <ShieldAlert className="size-3.5" /> Approve &amp; enter PIN
                        </button>
                      </div>
                    </>
                  ) : (
                    <PinEntry
                      pin={pin}
                      pinError={pinError}
                      onPinChange={(v) => {
                        setPin(v);
                        setPinError("");
                      }}
                      onBack={() => {
                        setPinStage(false);
                        setPin("");
                        setPinError("");
                      }}
                      onConfirm={() => void handleRefund()}
                      confirmLabel="Confirm PayPal Refund"
                      confirmClass="btn btn-danger"
                    />
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      )}

      {/* List footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
        <span>
          Showing <b>{filteredRows.length}</b> of <b>{rows.length}</b> entries
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5 text-brand-600" /> Proof Before Payout Enforced
        </span>
      </div>
    </div>
  );
}
