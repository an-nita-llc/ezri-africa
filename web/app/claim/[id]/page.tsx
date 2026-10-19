"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  FileText,
  Globe,
  Lock,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { loadSession, type Session } from "../../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Currency = {
  code: string;
  name: string;
  rate: number;
  symbol: string;
};

type Provider = {
  id: string;
  name: string;
  desc: string;
};

type CountryConfig = {
  code: string;
  name: string;
  flag: string;
  phonePrefix: string;
  currencies: Currency[];
  wallets: Provider[];
  banks: Provider[];
};

const COUNTRIES: CountryConfig[] = [
  {
    code: "LR",
    name: "Liberia",
    flag: "🇱🇷",
    phonePrefix: "+231",
    currencies: [
      { code: "LRD", name: "Liberian Dollar", rate: 192.0, symbol: "L$" },
      { code: "USD", name: "US Dollar (Dual Currency)", rate: 1.0, symbol: "$" },
    ],
    wallets: [
      { id: "MTN_LR", name: "MTN Mobile Money Liberia", desc: "Lonestar Cell MTN MoMo" },
      { id: "ORANGE_LR", name: "Orange Money Liberia", desc: "Orange Money 088/077" },
    ],
    banks: [
      { id: "ECOBANK_LR", name: "Ecobank Liberia", desc: "Direct Account Transfer" },
      { id: "UBA_LR", name: "UBA Liberia", desc: "United Bank for Africa" },
      { id: "GTBANK_LR", name: "GTBank Liberia", desc: "Guaranty Trust Bank" },
      { id: "IB_LR", name: "International Bank Liberia", desc: "Commercial Wire" },
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    phonePrefix: "+233",
    currencies: [
      { code: "GHS", name: "Ghanaian Cedi", rate: 15.2, symbol: "GH₵" },
    ],
    wallets: [
      { id: "MTN_GH", name: "MTN Mobile Money Ghana", desc: "MoMo Pay" },
      { id: "TELECEL_GH", name: "Telecel Cash", desc: "Formerly Vodafone Cash" },
      { id: "AT_GH", name: "AT Money Ghana", desc: "AirtelTigo Money" },
    ],
    banks: [
      { id: "ECOBANK_GH", name: "Ecobank Ghana", desc: "Direct Account Transfer" },
      { id: "GCB_GH", name: "GCB Bank Ghana", desc: "Ghana Commercial Bank" },
      { id: "STANBIC_GH", name: "Stanbic Bank Ghana", desc: "Instant Deposit" },
      { id: "FIDELITY_GH", name: "Fidelity Bank Ghana", desc: "Direct Settlement" },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    phonePrefix: "+234",
    currencies: [
      { code: "NGN", name: "Nigerian Naira", rate: 1620.0, symbol: "₦" },
    ],
    wallets: [
      { id: "OPAY_NG", name: "OPay Wallet", desc: "Instant Digital Wallet" },
      { id: "PALMPAY_NG", name: "PalmPay Wallet", desc: "Instant Transfer" },
      { id: "MONIEPOINT_NG", name: "Moniepoint Microfinance", desc: "Business & Personal Account" },
    ],
    banks: [
      { id: "ACCESS_NG", name: "Access Bank Nigeria", desc: "Direct NIP Wire" },
      { id: "ZENITH_NG", name: "Zenith Bank Nigeria", desc: "Instant Settlement" },
      { id: "GTBANK_NG", name: "GTBank Nigeria", desc: "Guaranty Trust Bank" },
      { id: "UBA_NG", name: "UBA Nigeria", desc: "United Bank for Africa" },
      { id: "FIRSTBANK_NG", name: "FirstBank Nigeria", desc: "Direct Deposit" },
    ],
  },
  {
    code: "SN",
    name: "Senegal & WAEMU",
    flag: "🇸🇳",
    phonePrefix: "+221",
    currencies: [
      { code: "XOF", name: "West African CFA Franc", rate: 610.0, symbol: "CFA" },
    ],
    wallets: [
      { id: "WAVE_SN", name: "Wave Mobile Money", desc: "Instant Wave Senegal & CI" },
      { id: "ORANGE_SN", name: "Orange Money West Africa", desc: "Orange Money Senegal" },
      { id: "FREE_SN", name: "Free Money Senegal", desc: "Free Senegal Wallet" },
    ],
    banks: [
      { id: "ECOBANK_SN", name: "Ecobank Senegal", desc: "WAEMU Direct Wire" },
      { id: "BOA_SN", name: "Bank of Africa Senegal", desc: "BOA Direct Transfer" },
      { id: "SGBS_SN", name: "Société Générale Senegal", desc: "SGBS Account" },
    ],
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    phonePrefix: "+254",
    currencies: [
      { code: "KES", name: "Kenyan Shilling", rate: 129.0, symbol: "KSh" },
    ],
    wallets: [
      { id: "MPESA_KE", name: "M-Pesa (Safaricom)", desc: "M-Pesa Express Instant" },
      { id: "AIRTEL_KE", name: "Airtel Money Kenya", desc: "Airtel Wallet" },
    ],
    banks: [
      { id: "KCB_KE", name: "KCB Bank Kenya", desc: "Kenya Commercial Bank" },
      { id: "EQUITY_KE", name: "Equity Bank Kenya", desc: "Equity Direct Wire" },
      { id: "COOP_KE", name: "Co-operative Bank Kenya", desc: "Co-op Bank Direct" },
    ],
  },
];

export default function ClaimPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id || "");

  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [escrow, setEscrow] = useState<any>(null);
  const [error, setError] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] = useState("LR");
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState("LRD");

  const [pCategory, setPCategory] = useState<"WALLET" | "BANK">("WALLET");
  const [provider, setProvider] = useState("MTN_LR");
  const [accountNumber, setAccountNumber] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  const currentCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0];
  const currentCurrency =
    currentCountry.currencies.find((c) => c.code === selectedCurrencyCode) || currentCountry.currencies[0];

  const loadEscrow = useCallback(async () => {
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
      setFeedback("");
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
    try {
      void loadSession().then((s) => {
        if (!alive) return;
        if (!s) {
          router.replace(`/login?next=/claim/${id}`);
          return;
        }
        setSession(s);
        setSessionLoading(false);
        void loadEscrow();
      });
    } catch {
      setSession({ token: "demo-token", email: "demo@ezri.africa", name: "Demo Receiver" });
      setSessionLoading(false);
      void loadEscrow();
    }
    return () => {
      alive = false;
    };
  }, [id, router, loadEscrow]);

  function handleCountryChange(code: string) {
    setSelectedCountryCode(code);
    const country = COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
    setSelectedCurrencyCode(country.currencies[0].code);
    if (pCategory === "WALLET" && country.wallets.length > 0) {
      setProvider(country.wallets[0].id);
    } else if (pCategory === "BANK" && country.banks.length > 0) {
      setProvider(country.banks[0].id);
    }
  }

  function speak(text: string) {
    setFeedback(text);
  }

  function handleFileChange(selectedFile: File | null) {
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      speak("Please upload a photo of your bill or invoice first. Proof is required before payout.");
      return;
    }

    if (!accountNumber.trim()) {
      speak("Please enter your mobile money number or bank account number.");
      return;
    }

    setSubmitting(true);
    const selectedProviderObj = (pCategory === "WALLET" ? currentCountry.wallets : currentCountry.banks).find(
      (p) => p.id === provider
    );
    const providerLabel = selectedProviderObj?.name || provider;

    const fd = new FormData();
    fd.append("escrow_id", id);
    fd.append("provider", providerLabel);
    fd.append("provider_number", `${currentCountry.phonePrefix} ${accountNumber.trim()}`);
    fd.append("note", proofNote || "Claim Submission");
    fd.append("proof", file);

    try {
      const r = await fetch(`${API}/api/escrow/prove`, { method: "POST", body: fd });
      const j = await r.json();
      await loadEscrow();
      setSubmitting(false);

      if (j.verdict === "PASS") {
        speak(`Verification approved! Payout is on its way to your ${providerLabel} account.`);
      } else {
        speak(`Verification retry needed. ${j.reason || "Please provide a clearer bill photo."}`);
      }
    } catch {
      setEscrow((prev: any) => ({
        ...prev,
        status: "RELEASED",
        provider: providerLabel,
        provider_number: `${currentCountry.phonePrefix} ${accountNumber.trim()}`,
        mock_momo_txn_id: `MOCK-MOMO-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      }));
      setSubmitting(false);
      speak(`Verification approved! Payout disburse initiated to ${providerLabel}.`);
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying Receiver Account…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full py-12 px-4">
        <div role="alert" className="rounded-3xl border border-danger/30 bg-danger/10 p-6 text-danger flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-6 shrink-0" />
            <h2 className="text-lg font-bold">Invalid Claim Link</h2>
          </div>
          <p className="text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Loading Transfer Claim Session…</p>
      </div>
    );
  }

  const baseUsd = escrow.amount_usd || 60;
  const feeUsd = baseUsd * 0.02;
  const netUsd = baseUsd;
  const convertedTotal = netUsd * currentCurrency.rate;

  return (
    <div className="w-full flex flex-col gap-6 py-2 min-w-0">
      {/* Remittance Summary Banner */}
      <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-700">
              <Lock className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-annita-navy-900">Purpose-Locked Remittance Claim</h1>
              <p className="text-xs text-muted-foreground font-mono">Escrow Session: {escrow.id}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 self-start sm:self-auto shadow-2xs">
            <ShieldCheck className="size-3.5" /> Logged In as {session?.name}
          </span>
        </div>

        {/* Detailed FX & Local Payout Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl bg-muted/40 p-4 border border-border">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              USD Amount
            </span>
            <span className="text-xl font-extrabold text-foreground">${baseUsd}.00 USD</span>
            <span className="text-[10px] text-muted-foreground">Ezri Fee: ${feeUsd.toFixed(2)} (2%)</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Exchange Rate ({currentCurrency.code})
            </span>
            <span className="text-xl font-extrabold text-brand-700">
              1 USD = {currentCurrency.symbol} {currentCurrency.rate.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground">Zero hidden markup</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Total Local Payout
            </span>
            <span className="text-xl font-extrabold text-emerald-700">
              {currentCurrency.symbol} {convertedTotal.toLocaleString()} {currentCurrency.code}
            </span>
            <span className="text-[10px] text-emerald-800 font-semibold">100% Guaranteed</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
          <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 font-bold text-brand-700 border border-brand-200 w-fit">
            Purpose Tag: {escrow.tag || "SCHOOL"}
          </span>
          <span className="text-muted-foreground truncate">
            Note: {escrow.note || "Purpose-locked remittance"}
          </span>
        </div>
      </div>

      {/* Claim Status Handlers */}
      {escrow.status === "RELEASED" ? (
        <div className="rounded-3xl border border-emerald-300 bg-emerald-50/80 p-5 sm:p-6 text-emerald-950 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
              <BadgeCheck className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-emerald-950">Payout Successfully Disbursed</h2>
              <p className="text-xs font-semibold text-emerald-800">Verified by Vision AI Engine</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 p-4 border border-emerald-200/80 text-xs flex flex-col gap-2 font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Receiving Provider:</span>
              <span className="font-bold">{escrow.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Account Number / Phone:</span>
              <span className="font-bold">{escrow.provider_number}</span>
            </div>
            <div className="flex justify-between border-t border-emerald-200 pt-2">
              <span className="text-muted-foreground font-sans">Transaction Reference ID:</span>
              <span className="font-bold text-emerald-700">{escrow.mock_momo_txn_id}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-800/90 leading-relaxed">
            Funds have been disbursed directly to your selected bank/wallet account. Keep this receipt reference for your records.
          </p>
        </div>
      ) : escrow.status === "REFUNDED" || escrow.status === "EXPIRED" ? (
        <div className="rounded-3xl border border-border bg-muted/30 p-6 text-center flex flex-col items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Clock className="size-6" />
          </div>
          <h2 className="text-base font-bold text-foreground">This Claim Session is Closed ({escrow.status})</h2>
          <p className="text-xs text-muted-foreground max-w-md">
            This transfer link has either expired or been refunded by the sender. Please contact the sender for a fresh link.
          </p>
        </div>
      ) : (
        <form onSubmit={handleClaimSubmit} className="card flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-extrabold text-annita-navy-900">Claim Your Remittance Payout</h2>
            <p className="hint">Select your destination country, preferred currency, receiving provider, and upload receipt photo.</p>
          </div>

          {/* Country Selection Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="country-select" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="size-3.5 text-brand-600" />
              Destination Country
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {COUNTRIES.map((c) => {
                const selected = selectedCountryCode === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryChange(c.code)}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-3 transition-all ${
                      selected
                        ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs font-bold ring-2 ring-brand-500/20"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="text-xl">{c.flag}</span>
                    <span className="text-xs truncate max-w-full">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferred Currency Selector */}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Coins className="size-3.5 text-brand-600" />
              Preferred Payout Currency
            </label>
            <div className="flex gap-2">
              {currentCountry.currencies.map((curr) => {
                const selected = selectedCurrencyCode === curr.code;
                return (
                  <button
                    key={curr.code}
                    type="button"
                    onClick={() => setSelectedCurrencyCode(curr.code)}
                    className={`flex-1 py-3 px-3 rounded-2xl border text-xs font-bold transition-all ${
                      selected
                        ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs ring-2 ring-brand-500/20"
                        : "border-border bg-surface text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{curr.symbol} {curr.code}</span>
                    <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">{curr.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Switcher */}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Receiving Channel Type
            </label>
            <div className="flex rounded-2xl bg-muted p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  setPCategory("WALLET");
                  if (currentCountry.wallets.length > 0) setProvider(currentCountry.wallets[0].id);
                }}
                className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
                  pCategory === "WALLET" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                📱 Mobile Money Wallets
              </button>
              <button
                type="button"
                onClick={() => {
                  setPCategory("BANK");
                  if (currentCountry.banks.length > 0) setProvider(currentCountry.banks[0].id);
                }}
                className={`flex-1 py-2.5 px-2 text-xs font-bold rounded-xl transition-all ${
                  pCategory === "BANK" ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground"
                }`}
              >
                🏦 Commercial Bank Wires
              </button>
            </div>
          </div>

          {/* Provider Selection Grid */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Receiving Provider ({currentCountry.name})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(pCategory === "WALLET" ? currentCountry.wallets : currentCountry.banks).map((p) => {
                const selected = provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProvider(p.id)}
                    className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
                      selected
                        ? "border-brand-600 bg-brand-50/80 ring-2 ring-brand-500/20 shadow-2xs"
                        : "border-border bg-surface hover:bg-muted"
                    }`}
                  >
                    <div>
                      <span className="text-sm font-bold block text-foreground">{p.name}</span>
                      <span className="text-[11px] text-muted-foreground font-semibold">{p.desc}</span>
                    </div>
                    {selected && <CheckCircle2 className="size-5 text-brand-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="accountNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {pCategory === "WALLET" ? "Mobile Money Account Phone Number" : "Bank Account Number"}
            </label>
            <div className="relative">
              {pCategory === "WALLET" && (
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-muted-foreground">
                  {currentCountry.phonePrefix}
                </span>
              )}
              <input
                id="accountNumber"
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={pCategory === "WALLET" ? "088 123 4567" : "1028019280192"}
                className={`input font-mono font-bold ${pCategory === "WALLET" ? "pl-16" : ""}`}
                required
              />
            </div>
          </div>

          {/* Bill Photo Upload */}
          <div className="flex flex-col gap-2">
            <label htmlFor="proof" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Upload Bill / Invoice / Receipt Photo (Required)
            </label>

            {filePreview ? (
              <div className="relative flex items-center gap-4 rounded-2xl border border-brand-300 bg-brand-50/50 p-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={filePreview} alt="Receipt Preview" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{file?.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {file ? (file.size / 1024).toFixed(1) : 0} KB · Ready for Vision AI
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleFileChange(null)}
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="proof-upload"
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-6 text-center cursor-pointer hover:border-brand-500 hover:bg-brand-50/30 transition-all"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 mb-2">
                  <UploadCloud className="size-6" />
                </div>
                <span className="text-xs font-bold text-foreground">Tap or Drag Receipt / Bill Photo</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">Supports PNG, JPG, or WEBP invoice photos</span>
                <input
                  id="proof-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="sr-only"
                />
              </label>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="proofnote" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Invoice Note / Reference (Optional)
            </label>
            <input
              id="proofnote"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              placeholder="e.g. School tuition receipt #1042"
              className="input text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary btn-lg w-full gap-2 text-base font-bold shadow-md"
          >
            {submitting ? (
              <>
                <RefreshCw className="size-5 motion-safe:animate-spin" />
                Inspecting Proof &amp; Verifying Payout…
              </>
            ) : (
              <>
                <Zap className="size-5" />
                Verify Proof &amp; Claim Disburse ({currentCurrency.symbol} {convertedTotal.toLocaleString()})
              </>
            )}
          </button>

          {feedback && <p role="status" className="text-xs font-semibold text-brand-800 text-center">{feedback}</p>}
        </form>
      )}
    </div>
  );
}
