# Ezri Africa — Web Frontend (Next.js 16 PWA)

> **Role:** Fortune 500 mobile-first Next.js 16 PWA with Light Mode default, full-bleed AI chat stream, pan-African receiver claim engine, multi-virtual card vault, and AG-Grid ledger.
> **Port:** `3000`

---

## Tech Stack

- **Framework**: Next.js 16.4 (App Router, Turbopack)
- **UI Library**: React 19.3 + Tailwind CSS 4.3 + Lucide Icons + AG-Grid 32
- **Language**: TypeScript 5.9 (`pnpm run typecheck` clean)
- **Theming**: Light Mode default with system/OS `@media (prefers-color-scheme: dark)` auto-detection.
- **Fluid Typography**: Dynamic responsive font scaling using CSS `clamp()` tokens.

---

## App Routes

| Route | Description |
|---|---|
| `/` | **AnnitaPlug AI Chat Stream**: Full-bleed OpenRouter copilot, 1-tap quick chips, embedded escrow cards, and PNG receipt slip download. |
| `/virtual-card` | **Ezri Virtual Card Vault**: Issue up to 3 custom Visa/Mastercard virtual cards, top-up, freeze, copy, and delete. Default empty state. |
| `/claim` | **Claim Hub**: Pan-African country selection grid (15 African countries) with live FX conversion rates and disburse channels. |
| `/claim/[id]` | **Receiver Claim Session**: 3-step form to upload bill photo proof and receive Mobile Money or Commercial Bank disburse. |
| `/purpose-lock` | **Settings & Purpose Lock**: Manage user avatar, profile info, category tags, AI receipt strictness, speech read-back approval, and PIN (`1234`). |
| `/dashboard` | **Transfers & Escrow Ledger**: Financial KPI summary ribbon, search, vector icon category filters, and AG-Grid table. |
| `/login` / `/signup` | **Auth**: Password login, 6-digit OTP tab, and One-Tap Demo button. |

---

## Commands

```bash
pnpm install       # Install dependencies
pnpm run dev       # Start Next.js dev server on http://localhost:3000
pnpm run typecheck # Run TypeScript typecheck (0 errors)
pnpm run build     # Production Next.js build
```
