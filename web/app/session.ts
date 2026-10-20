"use client";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export type Session = { token: string; email: string; name: string; role?: "ADMIN" | "USER" };
const KEY = "ezri_session";
const API = process.env.NEXT_PUBLIC_API_URL || "https://api.ezri-africa.com";

export async function loadSession(): Promise<Session | null> {
  try {
    const s = (await idbGet(KEY)) as Session | null;
    if (!s?.token) return null;
    const r = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${s.token}` } });
    if (!r.ok) {
      await idbDel(KEY);
      return null;
    }
    // Grant ADMIN role if email is an official admin email
    const isAdmin = ["admin@ezri.africa", "admin@ezri.com", "admin@annita.com"].includes(s.email.toLowerCase());
    return { ...s, role: isAdmin ? "ADMIN" : "USER" };
  } catch {
    return null;
  }
}

export async function saveSession(s: Session) {
  const isAdmin = ["admin@ezri.africa", "admin@ezri.com", "admin@annita.com"].includes(s.email.toLowerCase());
  const updated = { ...s, role: isAdmin ? ("ADMIN" as const) : ("USER" as const) };
  await idbSet(KEY, updated);
}

export async function clearSession() {
  await idbDel(KEY);
}

export function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}
