"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { authButtonClass, authInputClass } from "@/components/auth/classes";
import { saveSession } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function OtpVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const nextParam = searchParams.get("next");
  const destination =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const digits = code.replace(/[^0-9]/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setPending(true);
    try {
      const r = await fetch(`${API}/api/auth/demo`, { method: "POST" });
      const j = await r.json();
      if (!j.token || !j.user) {
        setError("That code didn't match. Try again or request a new code.");
        setPending(false);
        return;
      }
      await saveSession({ token: j.token, email: email || j.user.email, name: j.user.name });
      router.push(destination);
      router.refresh();
    } catch {
      setError("No connection to the API. Start the API server and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-5" noValidate>
      {error ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700"
      >
        <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <span>
          A 6-digit code is on its way to <strong>{email || "your email"}</strong>. It expires in 5
          minutes.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="otp-code" className="text-sm font-medium">
          6-digit code
        </label>
        <input
          id="otp-code"
          name="otp-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="••••••"
          className={`${authInputClass} text-center text-2xl font-bold tracking-[0.5em]`}
        />
        <p className="text-xs text-muted-foreground">
          Never share this code — Ezri staff will never ask for it. Demo: any 6 digits work.
        </p>
      </div>

      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            Verifying…
          </>
        ) : (
          "Verify and sign in"
        )}
      </button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Use a different method
        </Link>
        <button
          type="button"
          onClick={() => setCooldown(30)}
          disabled={cooldown > 0}
          className="font-medium text-brand-700 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </form>
  );
}

export default function VerifyOtpPage() {
  return (
    <AuthCard
      title="Enter your sign-in code"
      subtitle="We sent a one-time code to your email."
    >
      <Suspense
        fallback={
          <p role="status" className="py-4 text-center text-sm text-muted-foreground">
            Loading verification…
          </p>
        }
      >
        <OtpVerifyForm />
      </Suspense>
    </AuthCard>
  );
}
