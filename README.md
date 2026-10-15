# Ezri Africa — PayPal AI Hackathon

**Built for Africa, Liberia as pilot. PayPal in where PayPal can't receive locally — mobile money out.**

Purpose-locked P2P. Talk. Lock. Prove. Prove-first always.

## Run (judges: zero keys needed)
Mock PayPal + rule AI run offline. Real PayPal sandbox when keys set.

```bash
# API
cd api
pip install -r requirements.txt
pytest -q
uvicorn server:app --port 8000

# Web (new terminal) — pnpm, same toolchain as AnnitaPlug web (Next 16 / React 19 / TS 5.9)
cd web
pnpm install
pnpm run build
pnpm run dev
# open http://localhost:3000
```

Set real keys: copy `../.env.example` to `.env`, add `PAYPAL_CLIENT_ID/SECRET` (sandbox) and `OPENROUTER_API_KEY` (optional).

## Flow
1. Chat parse tag/amount/FX/fraud
2. Escrow create (PayPal Orders) -> approve (embedded JS SDK button, or approval-link fallback; mock auto-captures) -> capture -> HELD
3. Receiver opens no-login claim link `/claim/{id}`: picks ORANGE/MTN + number, uploads bill photo -> AI PASS/FAIL
4. PASS -> RELEASED + MOCK MoMo id. FAIL -> retry / sender override / refund.
5. Expiry 10 min demo (=48h production) -> refund path.

## Demo reset
```bash
cd api && python seed_demo.py   # 1 RELEASED + 1 NEEDS_RETRY for dashboard/video
```
Thumbnail source: `assets/make_thumbnail.py` -> `assets/thumbnail.png` (1200x800, text-only, upload to Devpost).

## Endpoints
`POST /api/chat/parse`, `POST /api/escrow/create|capture|prove|override|refund`, `POST /api/webhooks/paypal`, `GET /api/escrow/{id}`, `GET /api/dashboard?q=`.
Postman: `postman/ezri-africa.postman_collection.json` (set `{{base}}` to hosted API to replay judge flow).

## Resources used (Devpost)
- PayPal: REST Orders v2 + Payments Refunds (sandbox), Checkout approval link, Webhooks receiver, Developer Dashboard.
- Sponsors: AG Grid (ledger + ask-filter), Render (host), Postman (collection). Skipped on purpose: Channel3/Bryntum/Elastic/APIMatic/Astropods/KERNEL/Zapier — no fit for prove-first P2P.
- Track: Social Impact first (inclusion + accessibility), Money Movement second.

## Tools used
- PayPal: Orders v2 create/capture, Payments refunds, sandbox. JS approval link.
- AI: DeepSeek via OpenRouter for intent (fallback rules), heuristic fraud + FX, strict proof heuristic (Qwen vision in production), Web Speech STT + speechSynthesis TTS.
- AG Grid for live ledger + natural-language filter. Render to host.

## Video
<3 min YouTube: talk -> lock -> PayPal pay -> hold -> prove PASS + FAIL -> MoMo mock -> refund + offline queue + voice.

## License
MIT — see LICENSE.
