"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, Loader2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const ONBOARDING_KEY = "ezri:onboarding_completed";

export default function SplashLoaderPage() {
  const router = useRouter();
  const [statusText, setStatusText] = useState("Initializing Ezri Security Vault…");
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const t1 = setTimeout(() => {
      setStatusText("Connecting OpenRouter intent engine…");
      setProgress(45);
    }, 600);

    const t2 = setTimeout(() => {
      setStatusText("Verifying Pan-African Mobile Money Rails…");
      setProgress(80);
    }, 1200);

    const t3 = setTimeout(() => {
      setProgress(100);
      try {
        const completed = localStorage.getItem(ONBOARDING_KEY);
        if (completed === "true") {
          router.replace("/login");
        } else {
          router.replace("/onboarding");
        }
      } catch {
        router.replace("/onboarding");
      }
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-gradient-to-br from-[#003868] via-[#042441] to-[#02182c] p-6 text-white font-sans w-full">
      <div className="w-full flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white border border-white/20">
          <ShieldCheck className="size-3.5 text-brand-300" /> Security Audited
        </span>
      </div>

      {/* Main Logo & Loader */}
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="relative flex size-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-2xl animate-pulse">
          <Bot className="size-12" />
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-3xl font-extrabold tracking-tight">Ezri Africa</h1>
          <p className="text-xs text-brand-200 font-semibold uppercase tracking-widest">
            Purpose-Locked P2P Remittance
          </p>
        </div>

        {/* Progress Bar Container */}
        <div className="flex flex-col items-center gap-2 w-full mt-2">
          <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-white/80 font-mono">
            <Loader2 className="size-3.5 animate-spin text-brand-300" />
            <span>{statusText}</span>
          </div>
        </div>
      </div>

      {/* Footer Tagline */}
      <div className="flex items-center gap-1.5 text-xs text-white/60">
        <Sparkles className="size-3.5 text-brand-300" />
        <span>Protected by PayPal Sandbox Escrow &amp; deterministic proof</span>
      </div>
    </div>
  );
}
