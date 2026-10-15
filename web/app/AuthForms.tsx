"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "./session";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const box: React.CSSProperties = { margin: 0, fontFamily: "system-ui, sans-serif", background: "#0B1220", color: "#F5F7FA", minHeight: "100vh", padding: 20, fontSize: 20 };
const input: React.CSSProperties = { display: "block", width: "100%", maxWidth: 420, marginTop: 6, padding: 16, fontSize: 20, borderRadius: 10 };
const btn: React.CSSProperties = { marginTop: 16, padding: "16px 24px", fontSize: 20, background: "#2E7D32", color: "#fff", border: 0, borderRadius: 12 };

function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main style={box}>
      <h1>{title}</h1>
      <p style={{ opacity: 0.85 }}>One sender login. Receivers never log in — they use the claim link.</p>
      {children}
    </main>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function go(path: string, body?: object) {
    setMsg("Working…");
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
    <AuthShell title="Ezri Africa — Log in">
      <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" style={input} /></label>
      <label style={{ display: "block", marginTop: 12 }}>Password
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" style={input} />
      </label>
      <button onClick={() => go("/api/auth/login", { email, password })} style={btn}>Log in</button>
      <p><button onClick={() => go("/api/auth/demo")} style={{ ...btn, background: "#334" }}>One-tap demo login</button></p>
      <p>No account? <a href="/signup" style={{ color: "#8BC34A" }}>Sign up</a> · <a href="/" style={{ color: "#8BC34A" }}>Back</a></p>
      {msg && <p aria-live="polite">{msg}</p>}
    </AuthShell>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function submit() {
    setMsg("Working…");
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
    <AuthShell title="Ezri Africa — Sign up">
      <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" style={input} /></label>
      <label style={{ display: "block", marginTop: 12 }}>Email<input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" style={input} /></label>
      <label style={{ display: "block", marginTop: 12 }}>Password (min 4)
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" style={input} />
      </label>
      <button onClick={submit} style={btn}>Create account</button>
      <p>Have an account? <a href="/login" style={{ color: "#8BC34A" }}>Log in</a> · <a href="/" style={{ color: "#8BC34A" }}>Back</a></p>
      {msg && <p aria-live="polite">{msg}</p>}
    </AuthShell>
  );
}
