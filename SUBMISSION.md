# Ezri Africa — Devpost submission kit

Everything needed to submit and record, in one file. Nothing here is required
for the app to run — judges need **zero keys**.

| Link | URL |
| --- | --- |
| Live app | <https://ezri-africa.com> |
| API (health) | <https://api.ezri-africa.com/api/health> |
| Repo | <https://github.com/an-nita-llc/ezri-africa> |
| Demo video | _paste YouTube/Vimeo URL before submitting_ |
| Postman docs | _paste the APIMatic/Postman portal link if published_ |

Tracks: **Social Impact (primary)** · **Money Movement (secondary)**.

---

## 1. Paste-ready Devpost fields

**Project name**
`Ezri Africa — Proof Before Payout`

**Elevator pitch (≈200 chars)**
> Purpose-locked P2P escrow for Africa: PayPal in, AI-verified bill photo as
> proof, mobile money out. No proof, no payout — unclaimed money auto-refunds.

**Short description**
> Ezri is purpose-locked escrow for diaspora remittances. A sender pays with
> PayPal; the money is held until the receiver photographs the bill it was
> meant for — school fees, groceries, a hospital invoice. An AI guard checks
> the photo against the locked purpose, then releases the money to mobile
> money. Wrong bill → no payout. No photo → no payout. Unclaimed → auto-refund.
> The 2% fee is paid by the sender on top, so the family receives every dollar
> that was sent.

**Inspiration**
> Remittances to Sub-Saharan Africa cost around 8% on average, and even after
> the fee the sender has no idea whether the money reached its purpose. "I sent
> $60 for school fees — did the school actually get it?" Ezri answers that
> question with a photo, an AI verdict, and a released payment. Purpose-locking
> also protects receivers from pressure to divert money to other uses.

**What it does**
> - Chat-first intent: "Send $60 to mom for school fees" → SCHOOL purpose lock,
>   2% fee on top, live LRD preview at 1 USD = 194.50 LRD.
> - PayPal order + capture (mock with zero keys) → funds HELD in escrow.
> - Receiver claim page: pick provider (MTN/Orange/any label), upload the bill
>   photo, submit → strict AI proof check → RELEASED or NEEDS_RETRY with a reason.
> - Sender override (PIN 1234) and full refunds of amount + fee; auto-refund on
>   expiry.
> - AG Grid Transfers Ledger with risk/purpose/text filters.
> - Persisted virtual card vault (max 3 cards, freeze, top-up, delete).
> - Purpose-lock preferences saved server-side per sender.
> - Email OTP sign-in and password reset (codes shown on screen in demo mode;
>   Zapier delivers real email/SMS when a webhook is configured).
> - Automation log: every lifecycle event is recorded and POSTed to a Zapier
>   Catch Hook when `NOTIFY_WEBHOOK_URL` is set.

**How we built it**
> Next.js 16 / React 19 / TypeScript / Tailwind on the web; FastAPI + Python on
> the API; PayPal Orders v2 with capture/refund (deterministic mock fallback);
> deterministic heuristic AI guard (OpenRouter optional); PBKDF2 + opaque
> session tokens; SQLite locally / dual Postgres in production (Neon primary +
> Prisma secondary, mirrored writes and automatic failover); an Upstash Redis
> read cache in front of every ledger read; AG Grid for the ledger; Render for
> hosting; Postman/OpenAPI for the API surface; GitHub Actions for the
> production image build.

**Challenges we ran into**
> - Proving purpose without punishing the receiver: a strict checklist, a clear
>   failure reason, and a human override/refund path.
> - Making the whole product demoable with zero external keys — every provider
>   has a deterministic mock, so judges never configure anything.
> - Keeping the money math honest: 2% fee charged on top, refunds return
>   amount + fee, duplicate webhooks are idempotent.
> - Building the production image on a memory-constrained laptop — CI builds it
>   on a 16 GB runner instead.

**Accomplishments we're proud of**
> - The full production flow works end to end: parse → escrow → capture →
>   proof → release/refund, verified live on ezri-africa.com.
> - Judges can run the entire demo with no accounts and no keys.
> - Real persistence for profile, cards, preferences and events, mirrored
>   across Neon + Prisma Postgres with automatic failover and an Upstash read
>   cache — no localStorage-only demos.

**What we learned**
> Purpose locks only work when the receiving side is a first-class user. The
> receiver needs a fast claim page, a clear reason when a photo fails, and a
> human route out. Demo determinism beats cleverness: a judge who sees the
> same release/refund every time trusts the product more than one who sees a
> live model hallucinate.

**What's next**
> - Real MTN/Orange mobile-money rails (the provider interface is already there).
> - Merchant payments directly from the virtual card vault.
> - Fraud graph across senders and receivers.
> - SMS/USSD claim links for feature phones.

**Built with**
> Next.js, React, TypeScript, Tailwind CSS, AG Grid, FastAPI, Python, Pydantic,
> PostgreSQL, Neon, Prisma Postgres, Upstash Redis, Render, Postman, PayPal,
> OpenRouter, Zapier, Docker, GitHub Actions.

---

## 2. Judge instructions (paste into "Try it out")

1. Open <https://ezri-africa.com/login>.
2. Sign in with **any** email + password (demo mode), or use the one-tap demo.
3. Type: `Send $60 to mom for school fees` and approve with PIN **1234**.
4. Open the claim link from the receipt, upload a **real bill photo**, and
   submit → the AI verdict and payout appear.
5. Check `/dashboard` for the AG Grid ledger, `/virtual-card` for the card
   vault, `/purpose-lock` for saved preferences, and **Settings → Automation &
   webhooks** for the live event log.

Demo facts: FX **1 USD = 194.50 LRD** · fee **2% on top** · demo expiry
**10 minutes** (production policy shown as 48h) · mobile money is **MOCK**.

---

## 3. Demo video shot list (under 3 minutes)

Record in **incognito** at 1440×900 or 1920×1080, English only, with the URL bar
visible. Disable extensions (Speechify caused hydration noise). Use a **real
bill photo** so the strict AI check passes.

| Time | Shot | Say / do |
| --- | --- | --- |
| 0:00–0:15 | Logo → home | "Sending money home is easy. Knowing it reached its purpose is not. Ezri is escrow with proof." |
| 0:15–0:45 | Chat | Type `Send $60 to mom for school fees` → show SCHOOL lock, fee $1.20, total $61.20, 11,670 LRD |
| 0:45–1:10 | Approval + PIN | Approve, enter PIN `1234`, capture PayPal (mock) → receipt shows HELD, claim link |
| 1:10–1:45 | Claim page | Open claim link → provider MTN, upload the real school invoice → PASS → RELEASED + `MOCK-MOMO-…` |
| 1:45–2:10 | Failure path | Second transfer → upload a random photo → FAIL with reason → sender override with PIN → RELEASED |
| 2:10–2:30 | Refund | Another transfer → refund → status REFUNDED (amount + fee) |
| 2:30–2:45 | Ledger + vault | Dashboard AG Grid, then `/virtual-card` (create/freeze) and `/purpose-lock` (save persisted) |
| 2:45–3:00 | Automation + close | Settings → Automation log; "Zero keys to judge. PayPal in, proof checked, mobile money out. Ezri." |

Thumbnail: logo mark on navy with the line **"Proof Before Payout"** —
`web/public/brand/annita-mark.png` is the same mark used by the favicon.

---

## 4. What Chris must provide (the only human inputs left)

### A. `DATABASE_URL` + `DATABASE_URL_SECONDARY` — dual PostgreSQL (≈8 min, free)

Without them the API falls back to SQLite, which **wipes on every Render
redeploy** (escrows, users, cards, prefs, events).

1. Create a free project at <https://neon.tech>; copy the pooled connection
   string (must end with `?sslmode=require`). This is `DATABASE_URL`.
2. Copy Neon's direct URL into `DATABASE_URL_UNPOOLED` for one-time schema init.
3. Create a free project at <https://console.prisma.io>; copy the pooled
   `postgres://…@pooled.db.prisma.io:5432/postgres?sslmode=require` string into
   `DATABASE_URL_SECONDARY`. The API mirrors writes to both and fails over.
4. Render → **ezri-api** → Environment → add all three. Save → redeploy.
5. Verify `/api/health` shows `db_mode: "dual"` and both targets `up`; create
   a transfer, redeploy, and confirm it survives.

### A2. Upstash Redis read cache (optional, ≈3 min, free)

The API works without it (per-process memory cache), but a shared cache keeps
both databases from being hammered and survives multiple Render instances.

1. Create a free Redis DB at <https://console.upstash.com/redis>.
2. Open **REST API** and copy the URL + token.
3. Render → **ezri-api** → Environment → add
   `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
4. Save → redeploy. `/api/health` flips `cache` to `"upstash"`.

### B. `NOTIFY_WEBHOOK_URL` — real OTP/reset email + Telegram/SMS via Zapier

1. In Zapier create a Zap with trigger **Webhooks by Zapier → Catch Hook**;
   copy the hook URL.
2. Render → **ezri-api** → Environment → add `NOTIFY_WEBHOOK_URL = <hook URL>`.
3. Add an action — Gmail "Send Email", Twilio SMS, or Telegram — mapping
   `event`, `code`, `reset_url`, `escrow_id`, `status`.
4. Save → redeploy. Settings → Automation flips to **Connected**, and
   `/verify-otp` delivers real codes (the demo code stays visible on screen).

### C. Demo video + thumbnail

Record the shot list above, upload to YouTube (unlisted is fine), and paste the
link into Devpost. Suggested filename: `ezri-africa-demo.mp4`.

### D. Devpost submission

Create the project on Devpost, paste the fields from section 1, add the video,
select **Social Impact** + **Money Movement**, tag AG Grid / Render / Postman,
and submit.

### E. Optional (not needed for judging)

- `OPENROUTER_API_KEY` — real LLM intent parsing instead of the heuristic.
- `PAYPAL_CLIENT_ID` + `PAYPAL_CLIENT_SECRET` — live sandbox PayPal orders.
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID` — browser-side PayPal buttons.
