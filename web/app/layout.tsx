import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "./shell";
import { InlineScript } from "./inline-script";
import { PrefsBoot } from "./prefs-boot";
import { JsonLd } from "@/components/seo/json-ld";
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
  metadataBase: new URL("https://ezri.africa"),
  title: {
    default: "Ezri Africa — Purpose-Locked P2P Remittance & AI Escrow Platform",
    template: "%s · Ezri Africa",
  },
  description:
    "Send money from diaspora to Africa for a purpose — food, school, healthcare, rent. PayPal foreign collection, OpenRouter AI purpose lock, and instant mobile money disburse across 15 African nations.",
  keywords: [
    "remittance Africa",
    "send money to Liberia",
    "send money to Ghana",
    "send money to Nigeria",
    "purpose locked escrow",
    "mobile money disburse",
    "PayPal Africa bridge",
    "virtual card Africa",
    "MTN Mobile Money",
    "Orange Money",
    "M-Pesa",
    "Ecobank remittance",
    "OPay",
    "Wave Mobile Money",
    "Ezri Africa",
    "Annita LLC",
  ],
  authors: [{ name: "Annita LLC", url: "https://ezri.africa" }],
  creator: "Annita LLC",
  publisher: "Ezri Africa",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "https://ezri.africa",
    languages: {
      "en-US": "https://ezri.africa",
      "en-LR": "https://ezri.africa",
      "en-GH": "https://ezri.africa",
      "en-NG": "https://ezri.africa",
      "fr-SN": "https://ezri.africa",
      "fr-CI": "https://ezri.africa",
      "sw-KE": "https://ezri.africa",
    },
  },
  icons: {
    icon: [
      { url: "/brand/annita-mark.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/brand/annita-mark.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/brand/annita-mark.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Ezri Africa — Purpose-Locked Remittance & AI Escrow Platform",
    description:
      "Cross-border payments built for Africa. PayPal collects abroad in US/EU; OpenRouter AI locks purpose; local mobile money pays out across 15 African nations.",
    url: "https://ezri.africa",
    siteName: "Ezri Africa",
    images: [
      {
        url: "https://ezri.africa/brand/annita-logo.png",
        width: 1200,
        height: 630,
        alt: "Ezri Africa Purpose Locked Remittance",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ezri Africa — Purpose-Locked Remittance Platform",
    description:
      "Send money to Africa for a purpose. Protected by PayPal Escrow & OpenRouter AI.",
    images: ["https://ezri.africa/brand/annita-logo.png"],
  },
  other: {
    "geo.region": "LR, GH, NG, SN, KE, ZA, CI, TZ, UG, RW, ET, EG, ZW, SL, GM",
    "geo.placename": "Monrovia, Accra, Lagos, Dakar, Nairobi, Johannesburg",
    "geo.position": "6.3156; -10.8074",
    "icbm": "6.3156, -10.8074",
  },
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
      <head>
        <InlineScript html={THEME_BOOTSTRAP} />
        <JsonLd />
      </head>
      <body className="min-h-full flex flex-col">
        <PrefsBoot />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
