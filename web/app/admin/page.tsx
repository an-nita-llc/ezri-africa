"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Globe,
  History,
  Lock,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { loadSession, type Session } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [escrows, setEscrows] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s || s.role !== "ADMIN") {
        router.replace("/login?next=/admin");
        return;
      }
      setSession(s);
      fetchStats();
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  async function fetchStats() {
    try {
      const r = await fetch(`${API}/api/dashboard`);
      const j = await r.json();
      setEscrows(j.rows || []);
    } catch {}
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Authenticating Admin Portal…</p>
      </div>
    );
  }

  const totalVolume = escrows.reduce((acc, r) => acc + (r.amount_usd || 0), 0);
  const totalRevenue = escrows.reduce((acc, r) => acc + (r.fee_usd || (r.amount_usd * 0.02)), 0);
  const activeEscrows = escrows.filter((r) => r.status === "HELD").length;
  const releasedEscrows = escrows.filter((r) => r.status === "RELEASED").length;
  const retryFlags = escrows.filter((r) => r.status === "NEEDS_RETRY").length;

  return (
    <div className="w-full flex flex-col gap-6 min-w-0">
      {/* Admin Top Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Admin Platform Management
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
              <ShieldCheck className="size-3.5" /> Root Admin: {session?.email}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ezri Africa System Control Center — manage users, inspect escrows, review virtual cards, and system configuration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchStats}
            className="btn btn-secondary btn-sm gap-2"
          >
            <RefreshCw className="size-3.5" />
            Refresh Metrics
          </button>
          <Link href="/admin/settings" className="btn btn-primary btn-sm gap-2">
            <Settings className="size-3.5" />
            Platform Config
          </Link>
        </div>
      </div>

      {/* Financial KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Volume</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <DollarSign className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">${totalVolume.toFixed(2)} USD</p>
            <p className="text-xs text-muted-foreground mt-0.5">Across all P2P remittance sessions</p>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Platform Revenue (2%)</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-emerald-950">${totalRevenue.toFixed(2)} USD</p>
            <p className="text-xs text-emerald-700/80 mt-0.5">Platform service fees collected</p>
          </div>
        </div>

        <div className="rounded-3xl border border-brand-200 bg-brand-50/50 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-800 uppercase tracking-wider">Active Escrows</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-xs">
              <Lock className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-brand-900">{activeEscrows} Held</p>
            <p className="text-xs text-brand-700/80 mt-0.5">Awaiting verified receipt proof</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-surface p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Disbursed Transfers</span>
            <div className="flex size-9 items-center justify-center rounded-2xl bg-[#003868] text-white shadow-xs">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold tracking-tight text-foreground">{releasedEscrows} Disbursed</p>
            <p className="text-xs text-muted-foreground mt-0.5">Via Mobile Money &amp; Banks</p>
          </div>
        </div>
      </div>

      {/* Admin Module Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <Link
          href="/admin/users"
          className="card flex flex-col gap-3 group hover:border-brand-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Users className="size-5" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-brand-600 transition" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground">User Management</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect user accounts, region filters (Diaspora vs Africa), and account statuses.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/escrows"
          className="card flex flex-col gap-3 group hover:border-brand-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Lock className="size-5" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-brand-600 transition" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Escrow &amp; Disburse Control</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review proof photos, approve manual disburse overrides, or force-refund stuck escrows.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/virtual-cards"
          className="card flex flex-col gap-3 group hover:border-brand-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <CreditCard className="size-5" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-brand-600 transition" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Virtual Cards Vault</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage system virtual cards, review balances, and toggle freeze statuses.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="card flex flex-col gap-3 group hover:border-brand-500 hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Settings className="size-5" />
            </div>
            <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-brand-600 transition" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground">Platform Configuration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure 2% platform fee, OpenRouter LLM models, and security logs.
            </p>
          </div>
        </Link>
      </div>

      {/* System Audit Activity Log */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="size-4 text-brand-600" /> Recent System Activity Logs
          </h2>
          <span className="text-xs text-muted-foreground">Live Escrow Events</span>
        </div>

        <div className="flex flex-col gap-2">
          {escrows.slice(0, 5).map((e) => (
            <div key={e.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-2xl border border-border bg-muted/20 text-xs gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-foreground">{e.id}</span>
                <span className="text-muted-foreground">· {e.tag} · ${e.amount_usd} USD</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{e.provider || "PayPal Sandbox"}</span>
                <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-brand-50 text-brand-700 border border-brand-200">
                  {e.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
