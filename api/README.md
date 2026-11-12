# Ezri Africa — Monolithic FastAPI Backend (Legacy / Direct Mode)

> **Role:** Monolithic FastAPI server containing direct HTTP routes, a dual-Postgres/SQLite ledger with automatic failover, an Upstash read cache, OpenRouter AI guard, and PayPal Orders v2 / Refunds client.
> **Port:** `8000` · **Deployed:** https://api.ezri-africa.com (health check `/api/health`)

---

## File Structure

- `server.py`: FastAPI server routes (`/api/auth/*`, `/api/chat/*`, `/api/escrow/*`, `/api/dashboard`, `/api/health`).
- `ai_guard.py`: OpenRouter DeepSeek intent parser, deterministic receipt proof guard, and risk scoring.
- `ledger.py`: CRUD for the Neon primary (`DATABASE_URL`), Prisma secondary (`DATABASE_URL_SECONDARY`), and SQLite fallback (`ezri.db`). Mirrors writes and fails over reads automatically.
- `cache.py`: Fail-open read cache (Upstash REST when configured, otherwise in-process memory) for SQL results, sessions, and public user profiles.
- `paypal_client.py`: PayPal Orders v2 create/capture, Payments Refunds API client.
- `redis_client.py`: Older async Upstash helper; the API uses `cache.py`.
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
