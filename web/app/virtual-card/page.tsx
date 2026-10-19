"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  History,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Snowflake,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Modal } from "@/components/ui/modal";
import { authHeaders, loadSession, type Session } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type VirtualCard = {
  id: string;
  name: string;
  number: string;
  expiry: string;
  cvv: string;
  balance: number;
  frozen: boolean;
  type: "Visa" | "Mastercard";
  colorBg: string;
};

// INITIAL CARDS IS EMPTY: No cards display until user chooses to create one!
const INITIAL_CARDS: VirtualCard[] = [];

const MOCK_CARD_TXNS = [
  { id: "TXN-9021", merchant: "Monrovia Consolidated High School", category: "Tuition", amount: 120.0, date: "Today, 10:14 AM", status: "Settled" },
  { id: "TXN-8812", merchant: "St. Joseph Catholic Hospital", category: "Healthcare", amount: 85.5, date: "Yesterday, 3:42 PM", status: "Settled" },
  { id: "TXN-7619", merchant: "J-Palm Pharmacy & Clinic", category: "Health", amount: 32.0, date: "14 Oct 2026", status: "Settled" },
];

export default function VirtualCardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [cards, setCards] = useState<VirtualCard[]>(INITIAL_CARDS);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [createModal, setCreateModal] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardType, setNewCardType] = useState<"Visa" | "Mastercard">("Visa");

  const [deleteModal, setDeleteModal] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<VirtualCard | null>(null);

  const [topUpModal, setTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("50");

  useEffect(() => {
    let alive = true;
    try {
      void loadSession().then((s) => {
        if (!alive) return;
        if (!s) {
          router.replace("/login?next=/virtual-card");
          return;
        }
        setSession(s);
        setLoading(false);
      });
    } catch {
      setSession({ token: "demo-token", email: "demo@ezri.africa", name: "Demo Sender" });
      setLoading(false);
    }
    return () => {
      alive = false;
    };
  }, [router]);

  const activeCard = cards.find((c) => c.id === activeCardId) || cards[0] || null;

  function handleCreateCard(e: React.FormEvent) {
    e.preventDefault();
    if (cards.length >= 3) return;

    const newId = `CARD-${Math.floor(100 + Math.random() * 900)}`;
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const newCard: VirtualCard = {
      id: newId,
      name: newCardName.trim() || "Virtual Remittance Card",
      number: `${newCardType === "Visa" ? "4242" : "5520"}  ${Math.floor(1000 + Math.random() * 9000)}  ${Math.floor(1000 + Math.random() * 9000)}  ${randDigits}`,
      expiry: "11/29",
      cvv: String(Math.floor(100 + Math.random() * 900)),
      balance: 100.0,
      frozen: false,
      type: newCardType,
      colorBg: cards.length === 1 ? "bg-brand-700" : cards.length === 2 ? "bg-annita-navy-900" : "bg-[#003868]",
    };

    setCards([...cards, newCard]);
    setActiveCardId(newId);
    setNewCardName("");
    setCreateModal(false);
  }

  function handleDeleteCard() {
    if (!cardToDelete) return;
    const remaining = cards.filter((c) => c.id !== cardToDelete.id);
    setCards(remaining);
    if (remaining.length > 0) {
      setActiveCardId(remaining[0].id);
    } else {
      setActiveCardId(null);
    }
    setDeleteModal(false);
    setCardToDelete(null);
  }

  function toggleFreeze(id: string) {
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, frozen: !c.frozen } : c))
    );
  }

  function copyCardNumber(card: VirtualCard) {
    const rawNumber = card.number.replace(/\s+/g, "");
    void navigator.clipboard?.writeText(rawNumber).then(() => {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  function handleTopUp(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(topUpAmount) || 0;
    if (val > 0 && activeCard) {
      setCards((prev) =>
        prev.map((c) => (c.id === activeCard.id ? { ...c, balance: c.balance + val } : c))
      );
      setTopUpModal(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Opening Virtual Card Vault…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 min-w-0">
      {/* Page Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-annita-navy-900">
              Ezri Virtual Remittance Cards
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
              <ShieldCheck className="size-3.5" /> Visa / Mastercard
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate up to 3 custom virtual cards to pay school fees, hospital bills, and merchants directly from escrow.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cards.length < 3 ? (
            <button
              type="button"
              onClick={() => setCreateModal(true)}
              className="btn btn-primary btn-sm gap-2"
            >
              <Plus className="size-4" />
              Generate Virtual Card ({cards.length}/3)
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground border border-border">
              Max Cards Reached (3/3)
            </span>
          )}
          {activeCard && (
            <button
              type="button"
              onClick={() => setTopUpModal(true)}
              className="btn btn-secondary btn-sm gap-2"
            >
              <Zap className="size-3.5" />
              Load Balance
            </button>
          )}
        </div>
      </div>

      {/* NO CARDS EMPTY STATE WHEN CARDS ARRAY IS EMPTY */}
      {cards.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center gap-4 bg-surface border-2 border-dashed border-border rounded-3xl w-full">
          <div className="flex size-16 items-center justify-center rounded-3xl bg-brand-50 border border-brand-200 text-brand-700 shadow-sm">
            <CreditCard className="size-8" />
          </div>
          <div className="max-w-md flex flex-col gap-1.5">
            <h2 className="text-xl font-extrabold text-foreground">No Virtual Cards Generated Yet</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Issuing a virtual card allows you or your receiver to pay tuition, hospital invoices, and online merchants directly from purpose-locked escrow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="btn btn-primary btn-lg gap-2 mt-2 shadow-md"
          >
            <Plus className="size-5" /> Generate Your First Virtual Card
          </button>
        </div>
      ) : (
        /* Wide Responsive Multi-Card Grid */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start w-full">
          {/* Cards Carousel / Column */}
          <div className="xl:col-span-2 flex flex-col gap-6 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Your Virtual Cards ({cards.length}/3)
              </span>
              <span className="text-xs text-muted-foreground">Tap card to select</span>
            </div>

            {/* Cards Grid - Spreads Wide on Desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card) => {
                const isSelected = activeCardId === card.id;
                const isShowingDetails = showDetailsId === card.id;

                return (
                  <div
                    key={card.id}
                    onClick={() => setActiveCardId(card.id)}
                    className={`flex flex-col gap-3 group cursor-pointer transition-all duration-300 ${
                      isSelected ? "scale-[1.01]" : "opacity-90 hover:opacity-100"
                    }`}
                  >
                    {/* Card Container */}
                    <div
                      className={`relative overflow-hidden rounded-3xl p-6 text-white shadow-xl transition-all duration-500 transform-gpu group-hover:-translate-y-1 group-hover:shadow-2xl border-2 ${
                        card.frozen
                          ? "bg-[#1e293b] border-slate-700 opacity-85"
                          : `${card.colorBg} border-white/20`
                      } ${isSelected ? "ring-4 ring-brand-500/30" : ""}`}
                    >
                      {/* Animated Shimmer Overlay */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:translate-x-[300%] transition-transform duration-1000"
                      />

                      {/* Solid Brand Accent Corner Tag */}
                      <div className="absolute top-0 right-0 h-16 w-16 bg-[#ea580c] rounded-bl-full opacity-90 pointer-events-none" />

                      <div className="relative flex flex-col justify-between h-48 sm:h-52 z-10">
                        {/* Top Bar */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <LogoMark size="sm" />
                            <span className="text-xs font-extrabold text-white truncate max-w-[130px]">
                              {card.name}
                            </span>
                          </div>

                          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider text-white border border-white/20">
                            <span className={`size-1.5 rounded-full ${card.frozen ? "bg-slate-400" : "bg-annita-green animate-pulse"}`} />
                            {card.frozen ? "FROZEN" : "ACTIVE"}
                          </span>
                        </div>

                        {/* Chip & Contactless */}
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-md bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-600/50 shadow-inner" />
                          <span className="text-xs font-mono text-white/80">((( </span>
                        </div>

                        {/* Card Number */}
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-white">
                              {isShowingDetails ? card.number : `••••  ••••  ••••  ${card.number.slice(-4)}`}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowDetailsId(isShowingDetails ? null : card.id);
                              }}
                              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
                            >
                              {isShowingDetails ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="flex items-end justify-between border-t border-white/20 pt-2.5 text-[11px]">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/60 block">
                              Holder
                            </span>
                            <span className="font-bold text-white uppercase">{session?.name || "Demo Sender"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/60 block">
                              Expires
                            </span>
                            <span className="font-mono font-bold text-white">{card.expiry}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-white/60 block">
                              CVV
                            </span>
                            <span className="font-mono font-bold text-white">{isShowingDetails ? card.cvv : "•••"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Controls */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCardNumber(card);
                        }}
                        className="btn btn-secondary btn-sm flex-1 gap-1.5"
                      >
                        {copiedId === card.id ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                        {copiedId === card.id ? "Copied" : "Copy Number"}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFreeze(card.id);
                        }}
                        className={`btn btn-sm ${card.frozen ? "btn-primary" : "btn-secondary text-amber-700"}`}
                      >
                        <Snowflake className="size-3.5" />
                        {card.frozen ? "Unfreeze" : "Freeze"}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardToDelete(card);
                          setDeleteModal(true);
                        }}
                        className="btn btn-danger-outline btn-sm"
                        title="Delete Card"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Card Overview Sidebar */}
          {activeCard && (
            <div className="card flex flex-col gap-5 w-full">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Active Card Balance
                  </span>
                  <p className="text-3xl font-extrabold text-foreground mt-0.5">${activeCard.balance.toFixed(2)} USD</p>
                  <p className="text-xs text-muted-foreground font-semibold">
                    ≈ {(activeCard.balance * 192).toLocaleString()} LRD
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[#003868] text-white shadow-xs">
                  <Zap className="size-6" />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Card Controls</span>
                <div className="rounded-2xl bg-muted/40 p-4 border border-border flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Card Label:</span>
                    <span className="font-bold text-foreground">{activeCard.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Type:</span>
                    <span className="font-bold text-foreground">{activeCard.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Daily Limit:</span>
                    <span className="font-bold text-foreground">$1,000.00 USD</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">2FA Guard:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="size-3.5" /> Enforced
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTopUpModal(true)}
                className="btn btn-primary btn-block gap-2 font-bold"
              >
                <Zap className="size-4" /> Load Funds into {activeCard.name}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Transaction History Section */}
      {cards.length > 0 && (
        <section className="card flex flex-col gap-4 w-full">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <History className="size-4 text-brand-600" /> Virtual Card Charges
            </h2>
            <span className="text-xs text-muted-foreground">Settled merchant charges</span>
          </div>

          <div className="flex flex-col gap-2">
            {MOCK_CARD_TXNS.map((txn) => (
              <div
                key={txn.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border p-4 hover:bg-muted/30 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#003868] text-white shadow-xs">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{txn.merchant}</p>
                    <p className="text-[11px] text-muted-foreground">{txn.date} · {txn.category}</p>
                  </div>
                </div>

                <div className="text-right flex items-center justify-between sm:flex-col sm:items-end">
                  <p className="text-sm font-extrabold text-foreground">-${txn.amount.toFixed(2)} USD</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    {txn.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Modal 1: Generate Card Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-annita-navy-950/60 p-4 backdrop-blur-sm animate-overlay-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-modal-in flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Generate Virtual Card ({cards.length + 1}/3)</h3>
              <button
                type="button"
                onClick={() => setCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCard} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Card Nickname / Label</label>
                <input
                  type="text"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="e.g. School Fees Card, Medical Care"
                  className="input text-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Card Network</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCardType("Visa")}
                    className={`py-3 text-xs font-bold rounded-2xl border transition-all ${
                      newCardType === "Visa"
                        ? "border-brand-600 bg-brand-50 text-brand-700 shadow-xs"
                        : "border-border bg-surface text-foreground"
                    }`}
                  >
                    Visa Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCardType("Mastercard")}
                    className={`py-3 text-xs font-bold rounded-2xl border transition-all ${
                      newCardType === "Mastercard"
                        ? "border-brand-600 bg-brand-50 text-brand-700 shadow-xs"
                        : "border-border bg-surface text-foreground"
                    }`}
                  >
                    Mastercard
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg font-bold gap-2">
                <Plus className="size-4" /> Issue Virtual Card
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Delete Card Modal */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        title="Delete Virtual Card?"
        description={`Deleting card "${cardToDelete?.name || ""}". Any remaining balance will return to your primary escrow pool.`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setDeleteModal(false)}
              className="btn btn-secondary btn-block sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteCard}
              className="btn btn-danger btn-block sm:w-auto"
            >
              Delete Card
            </button>
          </>
        }
      />

      {/* Modal 3: Top-up Modal */}
      {topUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-annita-navy-950/60 p-4 backdrop-blur-sm animate-overlay-in">
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl animate-modal-in flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">Load Virtual Card from PayPal Escrow</h3>
              <button
                type="button"
                onClick={() => setTopUpModal(false)}
                className="text-muted-foreground hover:text-foreground text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleTopUp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Amount to Load ($ USD)</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="input font-mono font-bold text-lg"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg font-bold">
                Confirm Load
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
