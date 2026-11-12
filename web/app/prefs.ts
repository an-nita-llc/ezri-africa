/**
 * App-wide preference store (localStorage-backed, SSR-safe).
 *
 * Settings and the navigation drawer both read/write through this module,
 * and an inline bootstrap script in the root layout mirrors the attribute
 * logic so preferences are applied before the first paint (no flash of the
 * wrong theme / text size).
 *
 * Attributes applied to <html>:
 *   data-theme="light|dark"        (resolved from theme pref incl. "system")
 *   data-font-scale="compact|big|xl"   (absent = default scale)
 *   data-font-family="legible|mono"    (absent = default stack)
 *   data-contrast="true"           (high contrast)
 */

export type ThemePref = "system" | "light" | "dark";
export type FontScalePref = "compact" | "default" | "big" | "xl";
export type FontFamilyPref = "default" | "legible" | "mono";

export type Prefs = {
  requireApproval: boolean;
  requirePin: boolean;
  refundApproval: boolean;
  contrast: boolean;
  simpleMode: boolean;
  notifyTransfers: boolean;
  notifyEscrow: boolean;
  notifyClaims: boolean;
  provider: string;
  country: string;
  theme: ThemePref;
  fontScale: FontScalePref;
  fontFamily: FontFamilyPref;
};

export const PREFS_KEY = "ezri:prefs";

export const DEFAULT_PREFS: Prefs = {
  requireApproval: true,
  requirePin: true,
  refundApproval: true,
  contrast: false,
  simpleMode: false,
  notifyTransfers: true,
  notifyEscrow: true,
  notifyClaims: true,
  provider: "Lonestar Cell (MTN) MoMo",
  country: "Liberia",
  theme: "system",
  fontScale: "default",
  fontFamily: "default",
};

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    // Migrate the legacy boolean "Dynamic big text" toggle.
    if (typeof stored.fontScale !== "string" && typeof stored.bigText === "boolean") {
      stored.fontScale = stored.bigText ? "big" : "default";
    }
    delete stored.bigText;
    return { ...DEFAULT_PREFS, ...(stored as Partial<Prefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function prefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve the effective dark state for a theme preference. */
export function isDarkTheme(theme: ThemePref): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return prefersDark();
}

/** Apply preferences as attributes on <html>. */
export function applyPrefs(prefs: Prefs): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", isDarkTheme(prefs.theme) ? "dark" : "light");
  if (prefs.fontScale !== "default") {
    root.setAttribute("data-font-scale", prefs.fontScale);
  } else {
    root.removeAttribute("data-font-scale");
  }
  if (prefs.fontFamily !== "default") {
    root.setAttribute("data-font-family", prefs.fontFamily);
  } else {
    root.removeAttribute("data-font-family");
  }
  if (prefs.contrast) {
    root.setAttribute("data-contrast", "true");
  } else {
    root.removeAttribute("data-contrast");
  }
}

/** Persist preferences and apply them immediately. */
export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* private mode / quota — still apply for this session */
  }
  applyPrefs(prefs);
}
