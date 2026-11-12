# Ezri Africa — One Page Plan (PayPal AI Hackathon, deadline Nov 12 2026)

**One-liner:** Purpose-locked P2P: PayPal in, mobile-money-out (mock), AI in the middle as guard.

## Problem / Audience
Built for Africa, Liberia as pilot, then GH/NG/SL/CI/SN. Core wedge: Liberia cannot receive via PayPal locally (verified — not on PayPal payout list). Fear of misuse, no proof, bad FX timing, poor access for offline/low-vision/older users.

## Solution
Web chat: talk -> lock for purpose -> PayPal sandbox pay -> escrow hold -> one-link confirm + receipt photo -> AI strict verify -> release or auto-refund.

## Scope lock
- IN: 1 sender login, no-login receiver link, tags (Food/School/Health/Rent/Emergency) + free text, strict photo check (receipt/date/amount/tag match), escrow ledger HELD->RELEASED/REFUNDED (PayPal capture held in merchant balance, MoMo MOCK from float, Refund API on timeout) + 48h auto-refund (10min in demo), PayPal Orders create/capture + Refund + Webhooks, offline queue (draft+autosync), disability (voice in/out, read-back, big/high-contrast, keyboard/SR, simple mode), AG Grid dashboard + NL filter, Render hosted demo, <3min video.
- OUT: real MoMo/Orange, shop catalog, MSME logins, multi-currency settlement, full KYC, native mobile.

## Architecture (mini, new public repo) — SAME STACK
Next.js PWA (chat + pay + dashboard, same as AnnitaPlug web) -> FastAPI / Next API (agent: intent, fraud, FX, escrow, verify, same as ai-service) -> PayPal sandbox + LLM + vision + IndexedDB outbox. Cards: same ChatCardRenderer pattern, 6 cards only. i18n: same flat-key `useTranslation` pattern, en/fr/zh roadmap, demo EN only.

## AI / PayPal proof for judges
- AI: intent parse (tag+note), fraud 0-100 + reason, FX advice, vision receipt check with Pass/Fail reason, voice STT/TTS.
- PayPal: real sandbox Order->Capture shown in video, Refund shown on fail/timeout, Webhook status updates. Mock MoMo clearly labeled MOCK.

## Offline / Disability demo checks
- Offline: airplane mode -> queued badge -> online -> auto-send. Mom link works on 2G.
- Disability: Tab-only full flow, screen-reader labels, mic-only send, high-contrast + 200% text still works.

## Video script (150 sec)
0-15 pain (John story), 15-60 talk->lock->PayPal pay, 60-100 mom confirm + AI pass + fail example, 100-130 dashboard + offline + voice + auto-refund, 130-150 impact + what’s next.

## Timeline (28 days, ~7 build days)
W1: repo + PayPal sandbox + chat+pay vertical slice. W2: escrow + photo strict + refund + dashboard. W3: offline + disability + Render + video + docs. Buffer 7 days for PayPal/Render issues.

## Risks
- Strict vision fails live -> show 1 pass + 1 intentional fail, allow sender override.
- PayPal sandbox delay -> include mock mode toggle + recorded backup.
- Scope creep (shops, 3 logins) -> frozen: 1 login, tags only.

## Decisions made
Name: Ezri Africa. Tags+free text: yes. Strict check: yes. Escrow + auto-refund: yes.
Boss calls (Oct 15):
1. Demo expiry: 10 min in demo, labeled "48h in production" — judges must see refund live.
2. Sender override on Fail: YES — sender can release anyway after warning. Human-in-loop.
3. Languages: reuse AnnitaPlug `locales/en.json` + `fr.json` (3543 keys, EN source). No new locale files. Pidgin/Simple = AI style toggle only. zh kept out of v1.
Reuse: same chat pattern (`ai-service/server.py` + `plug.py` + `gateway/ai_router.py` DeepSeek Flash + Qwen vision + Whisper STT), same offline-saved message pattern (`msg.offline`), same escrow hold/release pattern from `wallet/`+`escrow/`.

## Next decisions
1. Demo expiry: 10 min (display as 48h real)? → **DECIDED: 10-min demo clock, shown as 48h production.**
2. Sender override on Fail: yes? → **DECIDED: YES (after warning, human-in-loop).**
3. Pidgin + Simple English v1, French later? → **DECIDED: demo English only; simple-language = AI style toggle in Settings.**

## Shipped (status Oct 16 2026) — all of the above built in `ezri-africa/`
- **Auth:** any email+password demo sign-in, passkey button, OTP verify page, signup with phone/country/DOB/location/confirm-password — no Company ID anywhere.
- **AI chat:** intent classifier (`transfer | needs_amount | greeting | fees | escrow | help | status | chat`), conversational replies + chips, 3 money cards (Confirm → Escrow Session → lock summary), live agent terminal, two-stage gate (Approve → PIN 1234) before any action.
- **Escrow:** PayPal Orders create/capture (mock without keys) → HELD → claim link (receiver, no login) → provider pick + bill photo → strict PASS/FAIL + reason → RELEASED (MOCK MoMo id) / sender override / auto-refund of amount + 2% fee; 10-min demo expiry shown as 48h.
- **Money math:** 2% fee added on top + FX 194.50 LRD/USD consistent across chat, ledger, claim, purpose-lock, settings, health endpoint.
- **Surfaces:** AG Grid ledger with KPIs + NL filter, purpose-lock config, claim hub/detail (settings-style, sidebar on wide, header+bottom-nav on mobile), app settings, verify-OTP.
- **Design/accessibility:** Annita One tokens verbatim; token-driven **light/dark theme**; fluid `clamp()` typography with **Settings-driven theme / text size / font family / high contrast** (persisted, no flash); all hard-coded font sizes removed; mobile-first stacking; 4-item bottom nav; voice STT/TTS; safe-area + reduced-motion support.
- **Ops:** pytest vertical slice, vitest, `tsc` + `next build` green (14 routes), `render.yaml`, Postman collection, MIT license.
- **Docs:** modern README with mermaid + ASCII diagrams at `ezri-africa/README.md`; hub status updated in `README.md`.
