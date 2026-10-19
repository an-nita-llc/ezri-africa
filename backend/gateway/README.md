# Ezri Africa — API Direction Gateway

> **Role:** High-performance, Fortune 500 API Gateway and Direction Router.
> **Port:** `8000`

---

## Responsibilities

1. **Directional Request Routing**:
   - Proxies AI intent classification & receipt vision inspection requests to `ai-service` (`http://localhost:8001`).
   - Proxies database, escrow lifecycle, user authentication, and ledger queries to `db-service` (`http://localhost:8002`).

2. **CORS & Domain Whitelisting**:
   - Handles cross-origin requests from Next.js web frontend (`http://localhost:3000`) and mobile PWA clients.

3. **Multi-Service Health Monitoring**:
   - `GET /api/health` queries both underlying microservices (`ai-service` and `db-service`) and returns consolidated health statuses (`ai_service_online`, `db_service_online`).

---

## Key Endpoints

| Method & Route | Destination | Description |
|---|---|---|
| `GET /api/health` | Gateway Local | Multi-service health & parameter diagnostic |
| `POST /api/chat/parse` | `ai-service` (`:8001/parse`) | Natural language intent & purpose lock classification |
| `POST /api/auth/signup` | `db-service` (`:8002/auth/user`) | User account registration |
| `POST /api/auth/demo` | `db-service` (`:8002/auth/session`) | One-tap demo session generation |
| `POST /api/escrow/create` | `db-service` (`:8002/escrow/create`) | Create purpose-locked escrow record |
| `GET /api/escrow/{id}` | `db-service` (`:8002/escrow/{id}`) | Fetch escrow session details |
| `GET /api/dashboard` | `db-service` (`:8002/escrows`) | Fetch financial ledger transactions |

---

## Running Locally

```bash
python backend/gateway/main.py   # Runs on http://0.0.0.0:8000
```
