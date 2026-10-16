import { ShieldCheck } from "lucide-react";
import { BrandPanel } from "./brand-panel";
import { Logo } from "@/components/brand/logo";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="hidden w-[46%] shrink-0 lg:block">
        <div className="sticky top-0 h-dvh">
          <BrandPanel />
        </div>
      </div>
      <div className="relative flex flex-1 flex-col">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,var(--color-brand-100)_0%,transparent_100%)] opacity-60"
        />
        <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Logo
                size="md"
                textClassName="text-annita-navy-900"
                subtext="Purpose-locked P2P Payments"
              />
            </div>
            {children}
            <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
              Protected by PayPal sandbox escrow · Audited access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
