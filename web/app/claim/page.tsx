"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Globe,
  Lock,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { loadSession, type Session } from "../session";

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

const ALL_AFRICAN_COUNTRIES: CountryConfig[] = [
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
    ],
  },
  {
    code: "GH",
    name: "Ghana",
    flag: "🇬🇭",
    phonePrefix: "+233",
    currencies: [{ code: "GHS", name: "Ghanaian Cedi", rate: 15.2, symbol: "GH₵" }],
    wallets: [
      { id: "MTN_GH", name: "MTN Mobile Money Ghana", desc: "MoMo Pay" },
      { id: "TELECEL_GH", name: "Telecel Cash", desc: "Vodafone Cash" },
      { id: "AT_GH", name: "AT Money Ghana", desc: "AirtelTigo Money" },
    ],
    banks: [
      { id: "ECOBANK_GH", name: "Ecobank Ghana", desc: "Direct Wire" },
      { id: "GCB_GH", name: "GCB Bank Ghana", desc: "Commercial Deposit" },
      { id: "STANBIC_GH", name: "Stanbic Bank Ghana", desc: "Instant Deposit" },
    ],
  },
  {
    code: "NG",
    name: "Nigeria",
    flag: "🇳🇬",
    phonePrefix: "+234",
    currencies: [{ code: "NGN", name: "Nigerian Naira", rate: 1620.0, symbol: "₦" }],
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
    ],
  },
  {
    code: "SN",
    name: "Senegal & WAEMU",
    flag: "🇸🇳",
    phonePrefix: "+221",
    currencies: [{ code: "XOF", name: "CFA Franc", rate: 610.0, symbol: "CFA" }],
    wallets: [
      { id: "WAVE_SN", name: "Wave Mobile Money", desc: "Wave Senegal & CI" },
      { id: "ORANGE_SN", name: "Orange Money Senegal", desc: "Orange Money WA" },
      { id: "FREE_SN", name: "Free Money Senegal", desc: "Free Senegal Wallet" },
    ],
    banks: [{ id: "ECOBANK_SN", name: "Ecobank Senegal", desc: "WAEMU Direct Wire" }],
  },
  {
    code: "KE",
    name: "Kenya",
    flag: "🇰🇪",
    phonePrefix: "+254",
    currencies: [{ code: "KES", name: "Kenyan Shilling", rate: 129.0, symbol: "KSh" }],
    wallets: [
      { id: "MPESA_KE", name: "M-Pesa (Safaricom)", desc: "M-Pesa Express Instant" },
      { id: "AIRTEL_KE", name: "Airtel Money Kenya", desc: "Airtel Wallet" },
    ],
    banks: [
      { id: "KCB_KE", name: "KCB Bank Kenya", desc: "Kenya Commercial Bank" },
      { id: "EQUITY_KE", name: "Equity Bank Kenya", desc: "Equity Direct Wire" },
    ],
  },
  {
    code: "ZA",
    name: "South Africa",
    flag: "🇿🇦",
    phonePrefix: "+27",
    currencies: [{ code: "ZAR", name: "South African Rand", rate: 18.2, symbol: "R" }],
    wallets: [{ id: "VODAPAY_ZA", name: "VodaPay Wallet", desc: "Vodacom Pay" }],
    banks: [
      { id: "CAPITEC_ZA", name: "Capitec Bank Pay", desc: "Capitec Direct" },
      { id: "FNB_ZA", name: "First National Bank (FNB)", desc: "FNB Direct Deposit" },
      { id: "STANDARD_ZA", name: "Standard Bank SA", desc: "Instant Pay" },
    ],
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    flag: "🇨🇮",
    phonePrefix: "+225",
    currencies: [{ code: "XOF", name: "CFA Franc CI", rate: 610.0, symbol: "CFA" }],
    wallets: [
      { id: "WAVE_CI", name: "Wave Côte d'Ivoire", desc: "Wave Money CI" },
      { id: "ORANGE_CI", name: "Orange Money CI", desc: "Orange Wallet CI" },
      { id: "MTN_CI", name: "MTN MoMo Côte d'Ivoire", desc: "MTN CI Wallet" },
    ],
    banks: [{ id: "ECOBANK_CI", name: "Ecobank Côte d'Ivoire", desc: "Direct Deposit" }],
  },
  {
    code: "TZ",
    name: "Tanzania",
    flag: "🇹🇿",
    phonePrefix: "+255",
    currencies: [{ code: "TZS", name: "Tanzanian Shilling", rate: 2680.0, symbol: "TSh" }],
    wallets: [
      { id: "MPESA_TZ", name: "M-Pesa Tanzania", desc: "Vodacom M-Pesa" },
      { id: "TIGO_TZ", name: "Tigo Pesa", desc: "Tigo Wallet" },
    ],
    banks: [{ id: "CRDB_TZ", name: "CRDB Bank Tanzania", desc: "CRDB Direct" }],
  },
  {
    code: "UG",
    name: "Uganda",
    flag: "🇺🇬",
    phonePrefix: "+256",
    currencies: [{ code: "UGX", name: "Ugandan Shilling", rate: 3670.0, symbol: "USh" }],
    wallets: [
      { id: "MTN_UG", name: "MTN Mobile Money Uganda", desc: "MTN MoMo UG" },
      { id: "AIRTEL_UG", name: "Airtel Money Uganda", desc: "Airtel Pay UG" },
    ],
    banks: [{ id: "STANBIC_UG", name: "Stanbic Bank Uganda", desc: "Direct Transfer" }],
  },
  {
    code: "RW",
    name: "Rwanda",
    flag: "🇷🇼",
    phonePrefix: "+250",
    currencies: [{ code: "RWF", name: "Rwandan Franc", rate: 1380.0, symbol: "FRw" }],
    wallets: [
      { id: "MTN_RW", name: "MTN Mobile Money Rwanda", desc: "MoMo Rwanda" },
      { id: "AIRTEL_RW", name: "Airtel Money Rwanda", desc: "Airtel Pay RW" },
    ],
    banks: [{ id: "BK_RW", name: "Bank of Kigali", desc: "BK Direct" }],
  },
  {
    code: "ET",
    name: "Ethiopia",
    flag: "🇪🇹",
    phonePrefix: "+251",
    currencies: [{ code: "ETB", name: "Ethiopian Birr", rate: 124.0, symbol: "Br" }],
    wallets: [
      { id: "TELEBIRR_ET", name: "Telebirr Wallet", desc: "Ethio Telecom" },
      { id: "CBE_ET", name: "CBE Birr", desc: "Commercial Bank Ethiopia" },
    ],
    banks: [{ id: "CBE_BANK_ET", name: "Commercial Bank of Ethiopia", desc: "CBE Direct" }],
  },
  {
    code: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    phonePrefix: "+20",
    currencies: [{ code: "EGP", name: "Egyptian Pound", rate: 48.5, symbol: "E£" }],
    wallets: [
      { id: "VODAFONE_EG", name: "Vodafone Cash Egypt", desc: "Vodafone Cash" },
      { id: "INSTAPAY_EG", name: "InstaPay Egypt", desc: "National Instant Pay" },
    ],
    banks: [{ id: "CIB_EG", name: "CIB Egypt", desc: "Commercial International Bank" }],
  },
  {
    code: "ZW",
    name: "Zimbabwe",
    flag: "🇿🇼",
    phonePrefix: "+263",
    currencies: [
      { code: "USD", name: "US Dollar", rate: 1.0, symbol: "$" },
      { code: "ZIG", name: "Zimbabwe Gold (ZiG)", rate: 13.8, symbol: "ZiG" },
    ],
    wallets: [
      { id: "ECOCASH_ZW", name: "EcoCash Zimbabwe", desc: "EcoCash USD/ZiG Wallet" },
      { id: "INNBUCKS_ZW", name: "InnBucks", desc: "Instant Local Wallet" },
    ],
    banks: [{ id: "CBZ_ZW", name: "CBZ Bank Zimbabwe", desc: "CBZ Direct" }],
  },
  {
    code: "SL",
    name: "Sierra Leone",
    flag: "🇸🇱",
    phonePrefix: "+232",
    currencies: [{ code: "SLE", name: "Sierra Leonean Leone", rate: 22.5, symbol: "Le" }],
    wallets: [
      { id: "ORANGE_SL", name: "Orange Money Sierra Leone", desc: "Orange MoMo SL" },
      { id: "AFRICELL_SL", name: "Africell Money Sierra Leone", desc: "AfriMoney" },
    ],
    banks: [{ id: "ROKEL_SL", name: "Rokel Commercial Bank", desc: "Direct Wire SL" }],
  },
  {
    code: "GM",
    name: "Gambia",
    flag: "🇬🇲",
    phonePrefix: "+220",
    currencies: [{ code: "GMD", name: "Gambian Dalasi", rate: 71.0, symbol: "D" }],
    wallets: [
      { id: "QMONEY_GM", name: "QMoney Gambia", desc: "QCell QMoney" },
      { id: "AFRICELL_GM", name: "AfriMoney Gambia", desc: "Africell Wallet" },
    ],
    banks: [{ id: "TRUST_GM", name: "Trust Bank Gambia", desc: "Trust Bank Direct" }],
  },
];

export default function ClaimHubPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [escrowInput, setEscrowInput] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("LR");

  useEffect(() => {
    let alive = true;
    try {
      void loadSession().then((s) => {
        if (!alive) return;
        if (!s) {
          router.replace("/login?next=/claim");
          return;
        }
        setSession(s);
        setLoading(false);
      });
    } catch {
      setSession({ token: "demo-token", email: "demo@ezri-africa.com", name: "Demo Receiver" });
      setLoading(false);
    }
    return () => {
      alive = false;
    };
  }, [router]);

  const selectedCountry = ALL_AFRICAN_COUNTRIES.find((c) => c.code === selectedCountryCode) || ALL_AFRICAN_COUNTRIES[0];

  function handleClaimProceed(e: React.FormEvent) {
    e.preventDefault();
    if (!escrowInput.trim()) return;

    let cleanId = escrowInput.trim();
    if (cleanId.includes("/claim/")) {
      cleanId = cleanId.split("/claim/").pop()?.split("?")[0] || cleanId;
    }
    router.push(`/claim/${cleanId}`);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Sparkles className="size-8 text-brand-600 motion-safe:animate-bounce" />
        <p className="text-sm font-semibold text-muted-foreground">Verifying Receiver Session…</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 py-2 min-w-0">
      {/* Banner Header */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-brand-50 border border-brand-200 text-brand-700">
              <Download className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-annita-navy-900">Claim Remittance Payout</h1>
              <p className="text-xs text-muted-foreground font-semibold">Receiver Account: {session?.email}</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-annita-green/15 px-3 py-1 text-xs font-bold text-annita-green-dark border border-annita-green/30">
            Authenticated
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Enter or paste your Escrow Session ID or claim link provided by your sender to upload proof and disburse Mobile Money or Bank Wires across Africa.
        </p>
      </div>

      {/* Enter Claim Session Form */}
      <form onSubmit={handleClaimProceed} className="card flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="escrow-id" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Escrow Session ID or Claim Link
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              id="escrow-id"
              value={escrowInput}
              onChange={(e) => setEscrowInput(e.target.value)}
              placeholder="e.g. EZR-8F32A1 or paste link..."
              className="input pl-10 font-mono text-sm"
              required
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Example: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">EZR-8F32A1</code>
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-lg w-full gap-2 text-base font-bold shadow-md"
        >
          <Zap className="size-5" />
          Continue to Claim Session
        </button>
      </form>

      {/* African Countries Coverage Grid */}
      <section className="card flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Globe className="size-4 text-brand-600" /> Pan-African Coverage &amp; FX Rates ({ALL_AFRICAN_COUNTRIES.length} Countries)
          </h2>
          <span className="text-xs text-muted-foreground font-semibold">Live Real-time Rates</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2.5">
          {ALL_AFRICAN_COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelectedCountryCode(c.code)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                selectedCountryCode === c.code
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs font-bold ring-2 ring-brand-500/20"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <span className="text-2xl">{c.flag}</span>
              <span className="text-xs font-bold mt-1 truncate max-w-full">{c.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                1 USD = {c.currencies[0].symbol}{c.currencies[0].rate} {c.currencies[0].code}
              </span>
            </button>
          ))}
        </div>

        {/* Selected Country Disburse Overview */}
        <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 text-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between font-bold border-b border-brand-200/60 pb-2">
            <span className="text-brand-800 flex items-center gap-1.5 text-sm">
              <span>{selectedCountry.flag}</span> {selectedCountry.name} Disburse Channels
            </span>
            <span className="text-brand-700 font-mono">
              Phone Prefix: {selectedCountry.phonePrefix}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="font-bold text-foreground block mb-1">Mobile Money Wallets:</span>
              <ul className="list-disc list-inside text-muted-foreground flex flex-col gap-0.5">
                {selectedCountry.wallets.map((w) => (
                  <li key={w.id}><span className="font-semibold text-foreground">{w.name}</span> ({w.desc})</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="font-bold text-foreground block mb-1">Commercial Bank Wires:</span>
              <ul className="list-disc list-inside text-muted-foreground flex flex-col gap-0.5">
                {selectedCountry.banks.map((b) => (
                  <li key={b.id}><span className="font-semibold text-foreground">{b.name}</span> ({b.desc})</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Info Card */}
      <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 flex items-start gap-3">
        <ShieldCheck className="size-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-bold text-foreground block">Proof Before Payout Security Rule</span>
          Money remains safely held in PayPal sandbox escrow until you upload your invoice/receipt photo and select your Mobile Money Wallet or Commercial Bank Wire.
        </div>
      </div>
    </div>
  );
}
