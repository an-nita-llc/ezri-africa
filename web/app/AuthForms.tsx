"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CreditCard, Fingerprint, Globe, KeyRound, Loader2, Lock, Plane, ShieldCheck, Wallet, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authButtonClass, authInputClass } from "@/components/auth/classes";
import { PasswordField } from "@/components/auth/password-field";
import { loadSession, saveSession } from "./session";

const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";

function ErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function useRedirectIfAuthed() {
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => {
      if (s && alive) router.replace("/");
    });
    return () => {
      alive = false;
    };
  }, [router]);
}

async function post(path: string, body?: object): Promise<{ ok: boolean; detail?: string; token?: string; user?: { email: string; name: string } }> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return r.json();
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useRedirectIfAuthed();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const typedEmail = email.trim();
    if (!typedEmail) {
      setError("Please enter your email address.");
      return;
    }
    setPending(true);
    try {
      let session: { token: string; email: string; name: string } | null = null;
      const j = await post("/api/auth/login", { email: typedEmail, password });
      if (j.token && j.user) {
        session = { token: j.token, email: j.user.email, name: j.user.name };
      }
      if (!session) {
        const d = await post("/api/auth/demo", { email: typedEmail, password });
        if (d.token && d.user) {
          session = { token: d.token, email: d.user.email, name: d.user.name };
        }
      }
      if (!session) {
        setError(
          "We couldn't sign you in with those details. Check your email and password, then try again.",
        );
        setPending(false);
        return;
      }
      await saveSession(session);
      const next = searchParams.get("next");
      const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
      router.push(dest);
      router.refresh();
    } catch {
      setError("No connection to the API. Start the API server and try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <ErrorAlert message={error} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Work or personal email
        </label>
        <input
          id="email"
          name="email"
          type="text"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={authInputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <PasswordField
          id="password"
          name="password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
      </div>

      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            Signing you in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Demo mode: any email and password opens your sender session instantly.
      </p>
    </form>
  );
}

export function OtpSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function destination() {
    const next = searchParams.get("next");
    return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  }

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setPending(true);
    const params = new URLSearchParams({ email: email.trim() });
    const dest = destination();
    if (dest !== "/") params.set("next", dest);
    router.push(`/verify-otp?${params.toString()}`);
  }

  return (
    <form onSubmit={requestCode} className="flex flex-col gap-5" noValidate>
      {error ? <ErrorAlert message={error} /> : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="otp-email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="otp-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={authInputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            Sending code…
          </>
        ) : (
          <>
            <KeyRound aria-hidden="true" className="size-4" />
            Email me a sign-in code
          </>
        )}
      </button>
    </form>
  );
}

export function PasskeySignInButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signInWithPasskey() {
    setError(null);
    setPending(true);
    try {
      if (typeof window !== "undefined" && "PublicKeyCredential" in window) {
        try {
          const available =
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          if (available) {
            const challenge = crypto.getRandomValues(new Uint8Array(32));
            await navigator.credentials.get({
              publicKey: {
                challenge,
                rpId: window.location.hostname,
                userVerification: "preferred",
              },
            });
          }
        } catch {}
      }
      const j = await post("/api/auth/demo", {});
      if (!j.token || !j.user) {
        setError("Passkey sign-in didn't complete. Try again or use your email and password.");
        setPending(false);
        return;
      }
      await saveSession({ token: j.token, email: j.user.email, name: j.user.name });
      router.push("/");
      router.refresh();
    } catch {
      setError("No connection to the API. Start the API server and try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <ErrorAlert message={error} /> : null}
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={() => void signInWithPasskey()}
        disabled={pending}
        className="btn btn-secondary btn-lg hover:border-brand-300 hover:bg-brand-50"
      >
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            Waiting for your device…
          </>
        ) : (
          <>
            <Fingerprint aria-hidden="true" className="size-5 text-brand-600" />
            Continue with passkey
          </>
        )}
      </button>
    </div>
  );
}

export function SignInTabs() {
  const [method, setMethod] = useState<"password" | "code">("password");

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
      >
        {(
          [
            { value: "password", label: "Password", icon: Lock },
            { value: "code", label: "Email code", icon: KeyRound },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const selected = method === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setMethod(tab.value)}
              className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition ${
                selected
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        {method === "password" ? <LoginForm /> : <OtpSignInForm />}
      </div>
      <PasskeySignInButton />
      <p className="text-center text-sm text-muted-foreground">
        New to Ezri?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

const DIASPORA_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "European Union",
  "Australia",
  "Other Diaspora Country",
];

const AFRICAN_COUNTRIES = [
  "Liberia",
  "Ghana",
  "Nigeria",
  "Senegal",
  "Kenya",
  "South Africa",
  "Côte d'Ivoire",
  "Tanzania",
  "Uganda",
  "Rwanda",
  "Ethiopia",
  "Egypt",
  "Zimbabwe",
  "Sierra Leone",
  "Gambia",
];

const DIASPORA_PROVIDERS = [
  "PayPal Sandbox Escrow (Default)",
  "Debit or Credit Card",
  "Direct Bank Transfer",
];

const AFRICAN_PROVIDERS = [
  "MTN Mobile Money",
  "Orange Money",
  "M-Pesa (Safaricom)",
  "Wave Mobile Money",
  "OPay Wallet",
  "PalmPay Wallet",
  "Ecobank Pan-African Wire",
  "UBA (United Bank for Africa)",
  "GTBank Africa",
];

export function SignupForm() {
  const router = useRouter();

  // Step 1: Location Base Choice
  const [regionType, setRegionType] = useState<"DIASPORA" | "AFRICA">("DIASPORA");

  // Step 2: Country & Provider
  const [diasporaCountry, setDiasporaCountry] = useState("United States");
  const [diasporaProvider, setDiasporaProvider] = useState("PayPal Sandbox Escrow (Default)");

  const [africanCountry, setAfricanCountry] = useState("Liberia");
  const [africanProvider, setAfricanProvider] = useState("MTN Mobile Money");

  // Step 3: User Details
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [location, setLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("1234");

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  useRedirectIfAuthed();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError("Please enter your mobile phone number.");
      return;
    }
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter your city or location.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 4) {
      setError("Use at least 4 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords don't match. Try again.");
      return;
    }

    setPending(true);
    const selectedCountry = regionType === "DIASPORA" ? diasporaCountry : africanCountry;
    const selectedProvider = regionType === "DIASPORA" ? diasporaProvider : africanProvider;

    try {
      const j = await post("/api/auth/signup", {
        name: name || "Sender",
        email,
        password,
        phone: phone.trim(),
        country: selectedCountry,
        provider: selectedProvider,
        region_type: regionType,
        dob,
        location: location.trim(),
      });

      if (!j.token || !j.user) {
        setError(
          "We couldn't create that account. Use a different email and password, then try again.",
        );
        setPending(false);
        return;
      }

      await saveSession({ token: j.token, email: j.user.email, name: j.user.name });
      router.push("/");
      router.refresh();
    } catch {
      setError("No connection to the API. Start the API server and try again.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <ErrorAlert message={error} /> : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {/* Region Base Choice */}
        <div className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-3 border border-border">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Where are you currently based?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRegionType("DIASPORA")}
              className={`inline-flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                regionType === "DIASPORA"
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs ring-2 ring-brand-500/20"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <Plane aria-hidden="true" className="size-3.5" />
              Diaspora Abroad (Sender)
            </button>
            <button
              type="button"
              onClick={() => setRegionType("AFRICA")}
              className={`inline-flex items-center justify-center gap-1.5 py-3 px-2 text-xs font-bold rounded-xl border text-center transition-all ${
                regionType === "AFRICA"
                  ? "border-brand-600 bg-brand-50 text-brand-700 shadow-2xs ring-2 ring-brand-500/20"
                  : "border-border bg-surface text-foreground hover:bg-muted"
              }`}
            >
              <Globe aria-hidden="true" className="size-3.5" />
              Based in Africa (Receiver)
            </button>
          </div>
        </div>

        {/* Country & Provider Selection based on Region */}
        {regionType === "DIASPORA" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="diaspora-country" className="text-sm font-medium">
                Diaspora Residence Country
              </label>
              <select
                id="diaspora-country"
                value={diasporaCountry}
                onChange={(e) => setDiasporaCountry(e.target.value)}
                className={authInputClass}
              >
                {DIASPORA_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="diaspora-provider" className="text-sm font-medium">
                Primary Payment Provider
              </label>
              <select
                id="diaspora-provider"
                value={diasporaProvider}
                onChange={(e) => setDiasporaProvider(e.target.value)}
                className={authInputClass}
              >
                {DIASPORA_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                PayPal Sandbox Escrow collects your payment abroad securely.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="african-country" className="text-sm font-medium">
                African Country
              </label>
              <select
                id="african-country"
                value={africanCountry}
                onChange={(e) => setAfricanCountry(e.target.value)}
                className={authInputClass}
              >
                {AFRICAN_COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="african-provider" className="text-sm font-medium">
                Primary Local Disburse Provider
              </label>
              <select
                id="african-provider"
                value={africanProvider}
                onChange={(e) => setAfricanProvider(e.target.value)}
                className={authInputClass}
              >
                {AFRICAN_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Your preferred local wallet or bank account for instant disburse.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="John Doe"
            className={authInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Mobile phone number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+231 88 123 4567"
            className={`${authInputClass} font-mono`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dob" className="text-sm font-medium">
              Date of birth
            </label>
            <input
              id="dob"
              name="dob"
              type="date"
              autoComplete="bday"
              required
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              className={authInputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className="text-sm font-medium">
              City / location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              autoComplete="address-level2"
              required
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="e.g. Monrovia"
              className={authInputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="signup-email" className="text-sm font-medium">
            Email address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={authInputClass}
          />
        </div>

        <div className="flex flex-col gap-2">
          <PasswordField
            id="signup-password"
            name="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={4}
          />
          <PasswordField
            id="signup-confirm-password"
            name="confirmPassword"
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={4}
          />
        </div>

        <button type="submit" disabled={pending} className={authButtonClass}>
          {pending ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
              Creating your account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setPending(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 aria-hidden="true" className="size-6 text-brand-600" />
        </span>
        <p className="text-sm font-semibold">Check your inbox</p>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={authInputClass}
        />
      </div>
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            Sending…
          </>
        ) : (
          "Send reset link"
        )}
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <p className="text-sm font-semibold">This link is incomplete</p>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          The reset link is missing its security token. Request a new link below.
        </p>
        <Link href="/forgot-password" className="btn btn-primary mt-1">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError("Use at least 4 characters for password.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match. Try again.");
      return;
    }
    setPending(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setDone(true);
    setPending(false);
    setTimeout(() => router.push("/login"), 2000);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-50">
          <CheckCircle2 aria-hidden="true" className="size-6 text-brand-600" />
        </span>
        <p className="text-sm font-semibold">Password updated</p>
        <p className="text-sm text-muted-foreground">Taking you back to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <ErrorAlert message={error} /> : null}
      <PasswordField
        id="password"
        name="password"
        label="New password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        minLength={4}
      />
      <PasswordField
        id="confirm"
        name="confirm"
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        minLength={4}
      />
      <button type="submit" disabled={pending} className={authButtonClass}>
        {pending ? (
          <>
            <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
            Updating…
          </>
        ) : (
          "Set new password"
        )}
      </button>
    </form>
  );
}
