"use client";

import { useLayoutEffect } from "react";
import { applyPrefs, readPrefs } from "./prefs";

/**
 * Re-applies preferences to <html> right after hydration, before paint.
 *
 * The inline bootstrap script in layout.tsx already applied prefs before
 * the first paint; this restores them in development, where React Strict
 * Mode remounts components once and resets <html> attributes the script
 * had set (no-op in production). Guide: preventing-flash-before-hydration.
 */
export function PrefsBoot() {
  useLayoutEffect(() => {
    applyPrefs(readPrefs());
  }, []);
  return null;
}
