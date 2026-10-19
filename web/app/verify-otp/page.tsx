"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, KeyRound, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { authButtonClass, authInputClass } from "@/components/auth/classes";
import { saveSession } from "../session";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";

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
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const requestCode = useCallback(async () => {
    if (!email) return;
    setRequesting(true);
    setCooldown(30);
    try {
      const r = await fetch(`${API}/api/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || "Could not send a code.");
      setDemoCode(typeof j.demo_code === "string" ? j.demo_code : null);
      setDelivered(Boolean(j.delivered));
      setError(null);
    } catch {
      setError("Could not send a sign-in code. Check the email address and try again.");
    } finally {
      setRequesting(false);
    }
  }, [email]);

  useEffect(() => {
    if (email) void requestCode();
  }, [email, requestCode]);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email) {
      setError("Missing email address — start again from the sign-in page.");
      return;
    }
    const digits = code.replace(/[^0-9]/g, "");
    if (digits.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    setPending(true);
    try {
      const r = await fetch(`${API}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: digits }),
      });
      const j = await r.json();
      if (!r.ok || !j.token || !j.user) {
        setError(j?.detail || "That code didn't match. Try again or request a new code.");
        setPending(false);
        return;
      }
      await saveSession({ token: j.token, email: j.user.email, name: j.user.name });
      router.push(destination);
      router.refresh();
    } catch {
      setError("No connection to the API. Try again.");
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
        {demoCode ? (
          <span>
            Demo mode — no mailbox connected, so here is your code:{" "}
            <strong className="font-mono text-base font-extrabold tracking-[0.25em]">{demoCode}</strong>
            . It expires in 5 minutes.
          </span>
        ) : delivered ? (
          <span>
            A 6-digit code is on its way to <strong>{email || "your email"}</strong>. It expires in 5
            minutes.
          </span>
        ) : (
          <span>{requesting ? `Sending your code to ${email}…` : `A code for ${email} is on its way.`}</span>
        )}
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
          In demo mode the code is shown above. Never share this code — Ezri staff will never ask for it.
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
          onClick={() => void requestCode()}
          disabled={cooldown > 0 || requesting || !email}
          className="font-medium text-brand-700 hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {requesting ? "Sending…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend code"}
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
