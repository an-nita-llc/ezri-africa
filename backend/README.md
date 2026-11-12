# Ezri Africa — Fortune 500 Decoupled Backend Microservices

> **Decoupled Architecture:** Clean separation of concerns with an **API Direction Gateway**, **AI Microservice**, and **Prisma DB Microservice**.

```
backend/
├── gateway/         ── Port 8000: Direction Gateway, Auth middleware, Rate-limiting, CORS Router
├── ai-service/      ── Port 8001: optional OpenRouter intent parser, receipt inspector, Risk engine
└── db-service/      ── Port 8002: Prisma Postgres / PostgreSQL database layer & Escrow lifecycle
    └── prisma/
        └── schema.prisma  ── PostgreSQL database schema
```

---

## Service Architecture & Endpoints

### 1. API Direction Gateway (`backend/gateway/main.py` · Port 8000)
- **Role**: Entry point for Web and Mobile clients. Directs traffic to underlying microservices.
- **Endpoints**:
  - `GET /health` — Multi-service health check (`ai_service_online`, `db_service_online`).
  - `POST /api/chat/parse` — Directs AI intent parsing requests to `ai-service`.
  - `GET /api/dashboard` — Directs ledger queries to `db-service`.
  - `GET /api/escrow/{id}` — Directs escrow lookups to `db-service`.

### 2. AI Microservice (`backend/ai-service/main.py` · Port 8001)
- **Role**: Isolated AI computing engine. Interacts with OpenRouter multi-model LLMs.
- **Endpoints**:
  - `GET /health` — Service status & FX parameters (`1 USD = 194.50 LRD`).
  - `POST /parse` — Natural language intent classification, recipient extraction, and fee calculation.
  - `POST /inspect-receipt` — Vision AI receipt photo validation against purpose tags (`SCHOOL`, `FOOD`, `HEALTH`, `RENT`, `EMERGENCY`).

### 3. Database Microservice (`backend/db-service/main.py` · Port 8002)
- **Role**: Data persistence and ledger state machine. Connects to Prisma Postgres / PostgreSQL with automatic SQLite fallback.
- **Prisma Schema**: `backend/db-service/prisma/schema.prisma`
- **Tables**: `escrows`, `users`, `sessions`, `virtual_cards`.
- **Endpoints**:
  - `POST /escrow/create` — Create purpose-locked escrow record.
  - `GET /escrow/{eid}` — Retrieve escrow state.
  - `GET /escrows` — List all escrows for financial ledger.
  - `POST /auth/user` & `POST /auth/session` — User account & session token persistence.

---

## Running the Microservices Locally

```bash
# Start AI Microservice (Port 8001)
python backend/ai-service/main.py

# Start DB Microservice (Port 8002)
python backend/db-service/main.py

# Start Direction Gateway (Port 8000)
python backend/gateway/main.py
```
