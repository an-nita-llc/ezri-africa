"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  Filter,
  Lock,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { authHeaders, loadSession, type Session } from "../../session";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";

export default function AdminEscrowsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s || s.role !== "ADMIN") {
        router.replace("/login?next=/admin/escrows");
        return;
      }
      setSession(s);
      fetchEscrows();
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  async function fetchEscrows() {
    try {
      const r = await fetch(`${API}/api/dashboard`);
      const j = await r.json();
      setRows(j.rows || []);
    } catch {}
  }

  async function forceOverride(eid: string) {
    if (!session) return;
    await fetch(`${API}/api/escrow/override`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({
        escrow_id: eid,
        reason: "Root Admin Force Disburse Override",
      }),
    });
    fetchEscrows();
  }

  async function forceRefund(eid: string) {
    if (!session) return;
    await fetch(`${API}/api/escrow/refund`, {
      method: "POST",
      headers: authHeaders(session.token),
      body: JSON.stringify({ escrow_id: eid }),
    });
    fetchEscrows();
  }

  const filtered = rows.filter((r) => {
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return r.id.toLowerCase().includes(q) || (r.note || "").toLowerCase().includes(q) || (r.tag || "").toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening Escrow Control Center…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Admin Escrow Control Center
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              <Lock className="size-3.5" /> {rows.length} System Escrows
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Root admin control panel to inspect proof documents, force-disburse overrides, or trigger PayPal refunds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={fetchEscrows} className="btn btn-secondary btn-sm gap-1.5">
            <RefreshCw className="size-3.5" /> Sync
          </button>
          <Link href="/admin" className="btn btn-secondary btn-sm font-bold">
            ← Admin Home
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by escrow ID, tag, recipient..."
            className="input pl-10"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "HELD", "RELEASED", "NEEDS_RETRY", "REFUNDED"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                statusFilter === st
                  ? "bg-annita-navy-900 text-white shadow-2xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Escrow List */}
      <div className="flex flex-col gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="card flex flex-col gap-3 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <div>
                <span className="font-mono text-sm font-extrabold text-foreground">{r.id}</span>
                <span className="text-xs text-muted-foreground ml-2">PayPal: {r.paypal_order_id || "MOCK"}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                {r.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/30 p-3 rounded-2xl">
              <div>
                <span className="text-muted-foreground block font-bold">Amount</span>
                <span className="font-extrabold text-foreground">${r.amount_usd}.00 USD</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-bold">Ezri Fee (2%)</span>
                <span className="font-extrabold text-foreground">${(r.fee_usd || r.amount_usd * 0.02).toFixed(2)} USD</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-bold">Purpose Tag</span>
                <span className="font-extrabold text-brand-700">{r.tag}</span>
              </div>
              <div>
                <span className="text-muted-foreground block font-bold">Provider</span>
                <span className="font-extrabold text-foreground">{r.provider || "Not Claimed"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <a
                href={`/claim/${r.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm gap-1 text-xs"
              >
                <ExternalLink className="size-3.5" /> View Claim Link
              </a>

              {(r.status === "HELD" || r.status === "NEEDS_RETRY") && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => forceOverride(r.id)}
                    className="btn btn-primary btn-sm gap-1 text-xs"
                  >
                    <Zap className="size-3.5" /> Force Disburse Override
                  </button>
                  <button
                    type="button"
                    onClick={() => forceRefund(r.id)}
                    className="btn btn-danger-outline btn-sm gap-1 text-xs"
                  >
                    <RotateCcw className="size-3.5" /> Force Refund
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
