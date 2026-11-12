"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Eye,
  EyeOff,
  History,
  Lock,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { loadSession, type Session } from "../../session";

type VirtualCardAdmin = {
  id: string;
  userEmail: string;
  name: string;
  number: string;
  expiry: string;
  cvv: string;
  balance: number;
  frozen: boolean;
  type: "Visa" | "Mastercard";
};

const MOCK_ADMIN_CARDS: VirtualCardAdmin[] = [
  { id: "CARD-801", userEmail: "john.diaspora@example.com", name: "School Fees Card", number: "4242  8192  0192  8019", expiry: "11/29", cvv: "812", balance: 120.0, frozen: false, type: "Visa" },
  { id: "CARD-412", userEmail: "mary.monrovia@example.com", name: "Hospital Emergency Card", number: "5520  9012  3819  1028", expiry: "08/28", cvv: "419", balance: 85.5, frozen: false, type: "Mastercard" },
];

export default function AdminVirtualCardsPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<VirtualCardAdmin[]>(MOCK_ADMIN_CARDS);

  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (!alive) return;
      if (!s || s.role !== "ADMIN") {
        router.replace("/login?next=/admin/virtual-cards");
        return;
      }
      setSession(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  function toggleAdminFreeze(id: string) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c))
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening Virtual Card Vault Admin…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Virtual Cards Vault Management
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200">
              <CreditCard className="size-3.5" /> System Virtual Cards
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all issued user virtual cards, review balances, and toggle system-wide card freezes.
          </p>
        </div>

        <Link href="/admin" className="btn btn-secondary btn-sm font-bold">
          ← Back to Admin
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => (
          <div key={card.id} className="card flex flex-col gap-3 border border-border">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div>
                <span className="font-extrabold text-foreground text-sm">{card.name}</span>
                <p className="text-xs text-muted-foreground font-mono">{card.userEmail}</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${card.frozen ? "bg-slate-200 text-slate-800" : "bg-emerald-50 text-emerald-800"}`}>
                {card.frozen ? "FROZEN" : "ACTIVE"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-muted/40 p-3 rounded-2xl font-mono text-xs">
              <span>Card Number: <strong>{card.number}</strong></span>
              <span>Balance: <strong className="text-brand-700">${card.balance.toFixed(2)} USD</strong></span>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => toggleAdminFreeze(card.id)}
                className={`btn btn-sm ${card.frozen ? "btn-primary" : "btn-secondary text-amber-700"}`}
              >
                <Snowflake className="size-3.5" />
                {card.frozen ? "Unfreeze System Card" : "Freeze Card System-wide"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
