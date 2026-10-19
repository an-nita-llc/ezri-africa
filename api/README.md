# Ezri Africa — Monolithic FastAPI Backend (Legacy / Direct Mode)

> **Role:** Monolithic FastAPI server containing direct HTTP routes, SQLite/Postgres ledger, OpenRouter AI guard, and PayPal Orders v2 / Refunds client.
> **Port:** `8000` · **Deployed:** https://api.ezri-africa.com (health check `/api/health`)

---

## File Structure

- `server.py`: FastAPI server routes (`/api/auth/*`, `/api/chat/*`, `/api/escrow/*`, `/api/dashboard`, `/api/health`).
- `ai_guard.py`: OpenRouter DeepSeek intent parser, Qwen Vision receipt inspector, and risk scoring.
- `ledger.py`: Database CRUD operations for Prisma Postgres (`DATABASE_URL`) and SQLite (`ezri.db`).
- `paypal_client.py`: PayPal Orders v2 create/capture, Payments Refunds API client.
- `redis_client.py`: Upstash Redis caching client.
- `notify.py`: Zapier Catch Hook webhook notification publisher.
- `mcp_tools.py`: Model Context Protocol (MCP) stdio agent tool server.

---

## Running Locally

```bash
python -m uvicorn server:app --port 8000 --reload
```

## Running Unit Tests

```bash
python -m pytest -q   # Runs 16 vertical-slice backend unit tests
```
