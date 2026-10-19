"""Ezri API Gateway — Microservice Direction Gateway.
Directs all traffic from Web/Mobile to AI Service (port 8001) and DB Service (port 8002).
"""
from __future__ import annotations
import os
import httpx
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

AI_SERVICE_URL = os.environ.get("AI_SERVICE_URL", "http://127.0.0.1:8001")
DB_SERVICE_URL = os.environ.get("DB_SERVICE_URL", "http://127.0.0.1:8002")

_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
_CORS_ORIGINS = [
    o.strip()
    for o in (_origins_env or "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]

app = FastAPI(
    title="Ezri API Gateway — Direction Gateway",
    version="1.0.0",
    description="Fortune 500 Direction Gateway. Directs client traffic to AI Service and DB Microservices.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    async with httpx.AsyncClient(timeout=4.0) as client:
        try:
            ai_res = await client.get(f"{AI_SERVICE_URL}/health")
            ai_ok = ai_res.status_code == 200
        except Exception:
            ai_ok = False

        try:
            db_res = await client.get(f"{DB_SERVICE_URL}/health")
            db_ok = db_res.status_code == 200
        except Exception:
            db_ok = False

    return {
        "ok": True,
        "service": "api-gateway",
        "fee_pct": 0.02,
        "fx_lrd": 194.50,
        "ai_service_online": ai_ok,
        "db_service_online": db_ok,
    }


# ---- Auth Routing ----

class AuthIn(BaseModel):
    name: str = "John"
    email: str = ""
    password: str = ""


@app.post("/api/auth/signup")
async def proxy_signup(body: AuthIn):
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            res = await client.post(f"{DB_SERVICE_URL}/auth/user", json=body.model_dump())
            if res.status_code != 200:
                raise HTTPException(400, "User signup failed")
            s = await client.post(f"{DB_SERVICE_URL}/auth/session", json={"email": body.email})
            return {"token": s.json()["token"], "user": {"email": body.email, "name": body.name}}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"Auth DB error: {e}")


@app.post("/api/auth/demo")
async def proxy_demo(body: AuthIn | None = None):
    email = (body.email if body else "demo@ezri.africa") or "demo@ezri.africa"
    name = (body.name if body else "Demo Sender") or "Demo Sender"
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            s = await client.post(f"{DB_SERVICE_URL}/auth/session", json={"email": email})
            return {"token": s.json()["token"], "user": {"email": email, "name": name}}
        except Exception as e:
            raise HTTPException(502, f"Auth DB error: {e}")


# ---- AI Service Proxy ----

class ParseIn(BaseModel):
    text: str
    note: str = ""


@app.post("/api/chat/parse")
async def proxy_chat_parse(body: ParseIn):
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.post(f"{AI_SERVICE_URL}/parse", json=body.model_dump())
            return res.json()
        except Exception as e:
            raise HTTPException(502, f"AI Service error: {e}")


# ---- Escrow & Ledger Proxy ----

class EscrowCreateIn(BaseModel):
    amount_usd: float
    tag: str
    note: str = ""
    recipient: str = "mom"


@app.post("/api/escrow/create")
async def proxy_create_escrow(body: EscrowCreateIn):
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            res = await client.post(f"{DB_SERVICE_URL}/escrow/create", json=body.model_dump())
            data = res.json()
            mock_order = f"MOCK-ORDER-{data['id']}"
            return {
                "escrow_id": data["id"],
                "paypal_order_id": mock_order,
                "approval_url": f"https://www.sandbox.paypal.com/checkoutnow?token={mock_order}",
                "status": data["status"],
                "amount_usd": data["amount_usd"],
                "fee_usd": data["fee_usd"],
            }
        except Exception as e:
            raise HTTPException(502, f"DB Service error: {e}")


@app.get("/api/escrow/{eid}")
async def proxy_get_escrow(eid: str):
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            res = await client.get(f"{DB_SERVICE_URL}/escrow/{eid}")
            if res.status_code == 404:
                raise HTTPException(404, "Escrow not found")
            return res.json()
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(502, f"DB Service error: {e}")


@app.get("/api/dashboard")
async def proxy_dashboard(q: str = ""):
    async with httpx.AsyncClient(timeout=8.0) as client:
        try:
            res = await client.get(f"{DB_SERVICE_URL}/escrows")
            rows = res.json()
            if q.strip():
                s = q.strip().lower()
                rows = [r for r in rows if s in (r.get("note", "") + r.get("recipient", "") + r.get("tag", "")).lower()]
            return {"count": len(rows), "rows": rows, "mock_paypal": True}
        except Exception as e:
            raise HTTPException(502, f"DB Service error: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
