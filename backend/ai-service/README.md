# Ezri Africa — AI Microservice Engine

> **Status:** Optional/legacy microservice. The live gateway (`api/server.py`)
> uses the deterministic proof guard in `api/ai_guard.py` for receipt
> decisions; it does not call this service.
> **Role:** Decoupled AI Microservice powering OpenRouter multi-model LLM inference, risk scoring, and optional receipt inspection.
> **Port:** `8001`

---

## AI Capabilities & Models

1. **Intent Classification & Copilot**:
   - **Model**: OpenRouter DeepSeek V4 / Flash (`deepseek/deepseek-chat`).
   - Extracts transfer amounts ($ USD), recipient names, purpose categories (`SCHOOL`, `FOOD`, `HEALTH`, `RENT`, `EMERGENCY`, `GENERAL`), and calculates Ezri 2% fees & live FX rates (`1 USD = 194.50 LRD`).

2. **Vision Receipt Inspection**:
   - **Model**: OpenRouter Qwen Vision (`qwen/qwen-2.5-vl-72b-instruct`).
   - Inspects uploaded bill/invoice photos (`/inspect-receipt`) for legibility, purpose keyword match, and minimum file size requirements before disburse.

3. **Risk Scoring Engine**:
   - Evaluates fraud risk factors (transfer volume window, tag urgency, frequency) and outputs a numeric score (`0-100`).

---

## Key Endpoints

| Method & Route | Payload / Form | Description |
|---|---|---|
| `GET /health` | None | AI Service status & parameters (`fee_pct`, `fx_lrd`) |
| `POST /parse` | `{ text, note }` | OpenRouter natural language intent & purpose lock parser |
| `POST /inspect-receipt` | `tag, amount_usd, proof (file)` | Vision AI receipt photo inspection (`PASS` / `FAIL` + reason) |

---

## Environment Variables

- `OPENROUTER_API_KEY`: API key for OpenRouter LLM inference.
- `OPENROUTER_MODEL`: Selected model ID (default: `deepseek/deepseek-chat`).

---

## Running Locally

```bash
python backend/ai-service/main.py   # Runs on port 8001
```
