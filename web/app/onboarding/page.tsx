"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  Globe,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";

const ONBOARDING_KEY = "ezri:onboarding_completed";

const SLIDES = [
  {
    step: 1,
    badge: "AI-Powered Copilot",
    icon: MessageSquare,
    title: "1. Chat, Lock & Prove",
    headline: "Speak in plain words. AI locks the purpose.",
    description:
      "Type or speak your send in plain language. OpenRouter AI automatically extracts amount, recipient, and enforces a purpose tag (School, Food, Health, Rent, Emergency).",
    bgGradient: "from-brand-500/10 via-brand-50/50 to-transparent",
  },
  {
    step: 2,
    badge: "Prove Before Payout",
    icon: ShieldCheck,
    title: "2. PayPal Sandbox Escrow",
    headline: "Money stays held until receipt proof passes.",
    description:
      "Your transfer is captured into PayPal escrow and only released when the receiver in Africa uploads a verified invoice or bill photo proof. Sender auto-refund protected.",
    bgGradient: "from-emerald-500/10 via-emerald-50/50 to-transparent",
  },
  {
    step: 3,
    badge: "15 African Nations",
    icon: Globe,
    title: "3. Pan-African Disburse",
    headline: "Mobile Money & Bank Wires across Africa.",
    description:
      "Direct disburse into local Mobile Money Wallets (MTN MoMo, Orange, Wave, M-Pesa, OPay) and commercial bank accounts across 15 African countries with zero hidden FX markup.",
    bgGradient: "from-annita-navy-600/10 via-annita-navy-50/50 to-transparent",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  function handleFinish() {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {}
    router.push("/login");
  }

  function handleNext() {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  }

  function handlePrev() {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  }

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-between bg-background p-4 sm:p-6 w-full max-w-2xl mx-auto font-sans">
      {/* Top Header */}
      <header className="flex w-full items-center justify-between py-2 border-b border-border">
        <Logo size="sm" />
        <button
          type="button"
          onClick={handleFinish}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
        >
          Skip Onboarding
        </button>
      </header>

      {/* Main Slide Card */}
      <main className="flex-1 flex flex-col justify-center w-full py-8">
        <div className={`rounded-3xl border border-border bg-surface p-6 sm:p-8 shadow-md flex flex-col gap-6 bg-gradient-to-b ${slide.bgGradient} transition-all duration-300`}>
          {/* Badge & Step indicator */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 border border-brand-200 shadow-2xs">
              <Sparkles className="size-3.5 text-brand-600" /> {slide.badge}
            </span>
            <span className="text-xs font-mono font-extrabold text-muted-foreground">
              Step {currentSlide + 1} of 3
            </span>
          </div>

          {/* Hero Icon */}
          <div className="flex size-16 items-center justify-center rounded-3xl bg-[#003868] text-white shadow-md">
            <Icon className="size-8 text-brand-300" />
          </div>

          {/* Content */}
          <div className="flex flex-col gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-annita-navy-900 tracking-tight">
              {slide.title}
            </h1>
            <p className="text-base font-bold text-foreground">
              {slide.headline}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
              {slide.description}
            </p>
          </div>
        </div>
      </main>

      {/* Footer Navigation Bar */}
      <footer className="w-full flex flex-col gap-5 pt-4 border-t border-border">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((s, idx) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to step ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === idx ? "w-8 bg-brand-600" : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        {/* Next / Back / Finish Buttons */}
        <div className="flex items-center gap-3 w-full">
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              className="btn btn-secondary btn-lg flex-1 text-xs font-bold"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className="btn btn-primary btn-lg flex-1 gap-2 text-sm font-bold shadow-md"
          >
            {currentSlide === SLIDES.length - 1 ? (
              <>
                <Zap className="size-5" /> Get Started &amp; Sign In
              </>
            ) : (
              <>
                Next Step <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
