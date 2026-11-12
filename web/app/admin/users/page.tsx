"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Globe,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { loadSession, type Session } from "../../session";

type UserRecord = {
  email: string;
  name: string;
  phone: string;
  country: string;
  regionType: "DIASPORA" | "AFRICA";
  provider: string;
  status: "ACTIVE" | "FROZEN";
  createdAt: string;
};

const MOCK_USERS: UserRecord[] = [
  { email: "john.diaspora@example.com", name: "John Doe", phone: "+1 202 555 0184", country: "United States (🇺🇸)", regionType: "DIASPORA", provider: "PayPal Sandbox Escrow", status: "ACTIVE", createdAt: "15 Oct 2026" },
  { email: "mary.monrovia@example.com", name: "Mary Fallah", phone: "+231 88 123 4567", country: "Liberia (🇱🇷)", regionType: "AFRICA", provider: "MTN Mobile Money", status: "ACTIVE", createdAt: "14 Oct 2026" },
  { email: "kwame.accra@example.com", name: "Kwame Mensah", phone: "+233 24 901 2831", country: "Ghana (🇬🇭)", regionType: "AFRICA", provider: "Telecel Cash", status: "ACTIVE", createdAt: "12 Oct 2026" },
  { email: "chioma.lagos@example.com", name: "Chioma Okeke", phone: "+234 80 391 0291", country: "Nigeria (🇳🇬)", regionType: "AFRICA", provider: "OPay Wallet", status: "ACTIVE", createdAt: "10 Oct 2026" },
  { email: "admin@ezri.africa", name: "Ezri Root Administrator", phone: "+231 77 000 0000", country: "Liberia (🇱🇷)", regionType: "AFRICA", provider: "Root Security Access", status: "ACTIVE", createdAt: "01 Oct 2026" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [users, setUsers] = useState<UserRecord[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("ALL");

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s || s.role !== "ADMIN") {
        router.replace("/login?next=/admin/users");
        return;
      }
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  function toggleUserFreeze(email: string) {
    setUsers((prev) =>
      prev.map((u) => (u.email === email ? { ...u, status: u.status === "ACTIVE" ? "FROZEN" : "ACTIVE" } : u))
    );
  }

  const filteredUsers = users.filter((u) => {
    if (regionFilter !== "ALL" && u.regionType !== regionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.country.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening User Management…</p>
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
              Admin User Management
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              <Users className="size-3.5" /> {users.length} Total Users
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered senders and receivers, filter by region, and adjust account access privileges.
          </p>
        </div>

        <Link href="/admin" className="btn btn-secondary btn-sm font-bold">
          ← Back to Admin
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="card flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, country..."
            className="input pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "DIASPORA", "AFRICA"].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegionFilter(r)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                regionFilter === r
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              {r === "ALL" ? "All Regions" : r === "DIASPORA" ? "✈️ Diaspora" : "🌍 Africa"}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table / List */}
      <div className="flex flex-col gap-3">
        {filteredUsers.map((u) => (
          <div
            key={u.email}
            className="card flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border border-border"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 font-extrabold text-base shadow-xs shrink-0">
                {u.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-extrabold text-foreground">{u.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{u.email} · {u.phone}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {u.country} · Provider: <strong className="text-foreground">{u.provider}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  u.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-danger/10 text-danger border-danger/30"
                }`}
              >
                {u.status}
              </span>

              <button
                type="button"
                onClick={() => toggleUserFreeze(u.email)}
                className={`btn btn-sm ${u.status === "ACTIVE" ? "btn-danger-outline" : "btn-primary"}`}
              >
                {u.status === "ACTIVE" ? (
                  <>
                    <UserX className="size-3.5" /> Freeze Account
                  </>
                ) : (
                  <>
                    <UserCheck className="size-3.5" /> Activate
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
