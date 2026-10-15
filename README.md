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

# Web (new terminal)
cd web
npm install
npm run dev
# open http://localhost:3000
```

Set real keys: copy `../.env.example` to `.env`, add `PAYPAL_CLIENT_ID/SECRET` (sandbox) and `OPENROUTER_API_KEY` (optional).

## Flow
1. Chat parse tag/amount/FX/fraud
2. Escrow create (PayPal Orders) -> capture -> HELD
3. Receiver prove-first: provider ORANGE/MTN + number + bill photo -> AI PASS/FAIL
4. PASS -> RELEASED + MOCK MoMo id. FAIL -> retry / sender override / refund.
5. Expiry 10 min demo (=48h production) -> refund path.

## Endpoints
`POST /api/chat/parse`, `POST /api/escrow/create|capture|prove|override|refund`, `GET /api/escrow/{id}`, `GET /api/dashboard?q=`.

## Tools used
- PayPal: Orders v2 create/capture, Payments refunds, sandbox. JS approval link.
- AI: DeepSeek via OpenRouter for intent (fallback rules), heuristic fraud + FX, strict proof heuristic (Qwen vision in production), Web Speech STT + speechSynthesis TTS.
- AG Grid for live ledger + natural-language filter. Render to host.

## Video
<3 min YouTube: talk -> lock -> PayPal pay -> hold -> prove PASS + FAIL -> MoMo mock -> refund + offline queue + voice.

## License
MIT — see LICENSE.
