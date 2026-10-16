import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "./shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ezri Africa — Proof Before Payout",
    template: "%s · Ezri Africa",
  },
  description:
    "Chat, lock, prove. Turn PayPal into a protected mobile money bridge with AI verification, offline queue and escrow on every transaction.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#003868" },
    { media: "(prefers-color-scheme: dark)", color: "#0b111c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Applies saved appearance preferences (theme, text size, font, contrast)
 * before the first paint so there is no flash of the wrong theme. Mirrors
 * web/app/prefs.ts — keep the two in sync.
 */
const THEME_BOOTSTRAP = `(function () {
  try {
    var root = document.documentElement;
    var p = JSON.parse(localStorage.getItem("ezri:prefs") || "{}");
    var theme = typeof p.theme === "string" ? p.theme : "system";
    if (typeof p.fontScale !== "string" && typeof p.bigText === "boolean") {
      p.fontScale = p.bigText ? "big" : "default";
    }
    var dark =
      theme === "dark" ||
      (theme !== "light" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    if (p.fontScale && p.fontScale !== "default") {
      root.setAttribute("data-font-scale", p.fontScale);
    }
    if (p.fontFamily && p.fontFamily !== "default") {
      root.setAttribute("data-font-family", p.fontFamily);
    }
    if (p.contrast) root.setAttribute("data-contrast", "true");
    if (theme === "system") {
      window
        .matchMedia("(prefers-color-scheme: dark)")
        .addEventListener("change", function (e) {
          root.setAttribute("data-theme", e.matches ? "dark" : "light");
        });
    }
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
