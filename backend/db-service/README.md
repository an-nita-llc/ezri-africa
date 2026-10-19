# Ezri Africa — Database & Persistence Microservice

> **Role:** Data persistence layer for Escrow Sessions, Users, Sessions, and Virtual Cards. Connects to Prisma Postgres / PostgreSQL with automatic SQLite fallback.
> **Port:** `8002`

---

## Database Stack & ORM

- **Prisma Schema**: `prisma/schema.prisma`
- **Database Engine**: Prisma Postgres / PostgreSQL (`DATABASE_URL`) with automatic SQLite fallback (`ezri.db`).
- **Upstash Redis**: `redis_client.py` for REST-based caching of FX rates, rate-limiting, and session acceleration.

---

## Database Tables

| Table | Primary Key | Description |
|---|---|---|
| `escrows` | `id` (`EZR-XXXXXXXX`) | Purpose-locked escrow transfers, PayPal order IDs, status (`HELD`, `RELEASED`, `REFUNDED`, `NEEDS_RETRY`, `EXPIRED`), proof verdicts. |
| `users` | `email` | Registered user credentials and PBKDF2 password hashes. |
| `sessions` | `token` | Opaque authentication session tokens (`ezk_...`). |
| `virtual_cards` | `id` | Visa/Mastercard virtual cards generated per user (up to 3 cards). |

---

## Key Endpoints

| Method & Route | Payload | Description |
|---|---|---|
| `GET /health` | None | Database connection status |
| `POST /escrow/create` | `{ amount_usd, tag, note, recipient }` | Insert new escrow record |
| `GET /escrow/{eid}` | Path ID | Fetch escrow record |
| `GET /escrows` | Query `limit` | List transactions for financial ledger |
| `POST /auth/user` | `{ name, email, password }` | Register new user account |
| `POST /auth/session` | `{ email }` | Issue new session token |

---

## Running Locally

```bash
python backend/db-service/main.py   # Runs on http://0.0.0.0:8002
```
