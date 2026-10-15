import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Ezri Africa — PayPal bridge, Liberia pilot",
  description: "Purpose-locked P2P: PayPal in, mobile money out (mock). Talk. Lock. Prove.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#0B1220", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0B1220", color: "#F5F7FA" }}>
        {children}
      </body>
    </html>
  );
}
