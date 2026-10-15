"use client";
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { saveSession } from "./session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-annita-navy-900">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{sub}</p>
      </div>
      {children}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function go(path: string, body?: object) {
    setMsg("");
    try {
      const r = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.detail || "Failed. Try again.");
      await saveSession({ token: j.token, email: j.user.email, name: j.user.name });
      router.push("/");
    } catch {
      setMsg("No connection. Start the API and retry.");
    }
  }

  return (
    <Shell title="Log in" sub="One sender login. Receivers never log in — they use the claim link.">
      {msg ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{msg}</span>
        </div>
      ) : null}
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void go("/api/auth/login", { email, password }); }}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="label">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </div>
        <button type="submit" className="btn btn-primary btn-block">Log in</button>
      </form>
      <button type="button" onClick={() => go("/api/auth/demo")} className="btn btn-secondary btn-block">One-tap demo login</button>
      <p className="text-sm text-muted-foreground">No account? <a href="/signup" className="font-semibold text-brand-700 hover:underline">Sign up</a> · <a href="/" className="font-semibold text-brand-700 hover:underline">Back</a></p>
    </Shell>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    try {
      const r = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name || "Sender", email, password }),
      });
      const j = await r.json();
      if (!r.ok) return setMsg(j.detail || "Failed. Try again.");
      await saveSession({ token: j.token, email: j.user.email, name: j.user.name });
      router.push("/");
    } catch {
      setMsg("No connection. Start the API and retry.");
    }
  }

  return (
    <Shell title="Sign up" sub="Create your sender account. One login sends for everyone.">
      {msg ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <span>{msg}</span>
        </div>
      ) : null}
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="label">Password (min 4)</label>
          <input id="password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          <p className="hint">Demo-grade auth for the contest. Production uses full KYC.</p>
        </div>
        <button type="submit" className="btn btn-primary btn-block">Create account</button>
      </form>
      <p className="text-sm text-muted-foreground">Have an account? <a href="/login" className="font-semibold text-brand-700 hover:underline">Log in</a> · <a href="/" className="font-semibold text-brand-700 hover:underline">Back</a></p>
    </Shell>
  );
}
