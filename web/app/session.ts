"use client";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export type Session = { token: string; email: string; name: string };
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
    return s;
  } catch {
    return null;
  }
}

export async function saveSession(s: Session) {
  await idbSet(KEY, s);
}

export async function clearSession() {
  await idbDel(KEY);
}

export function authHeaders(token: string) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}
