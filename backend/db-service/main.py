"""Ezri Database & Ledger Microservice (FastAPI).
Handles escrows, users, sessions, and virtual cards database persistence.
"""
from __future__ import annotations
import os
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ledger import (
    create_escrow, create_session, create_user, find_by_capture,
    get_escrow, get_session_email, get_user, list_escrows, update_escrow, verify_user
)

app = FastAPI(
    title="Ezri DB & Ledger Microservice",
    version="1.0.0",
    description="Database & Persistence Microservice for Ezri Africa Escrows and User Sessions.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EscrowIn(BaseModel):
    amount_usd: float
    tag: str
    note: str = ""
    recipient: str = "mom"
    expiry_minutes: int = 10
    sender_email: str = ""


class UserIn(BaseModel):
    name: str = "John"
    email: str
    password: str


class SessionIn(BaseModel):
    email: str


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "db-service",
        "database": "Prisma Postgres / PostgreSQL" if os.environ.get("DATABASE_URL") else "SQLite",
    }


@app.post("/escrow/create")
def api_create_escrow(body: EscrowIn):
    return create_escrow(
        body.amount_usd, body.tag, body.note, body.recipient, body.expiry_minutes, body.sender_email
    )


@app.get("/escrow/{eid}")
def api_get_escrow(eid: str):
    row = get_escrow(eid)
    if not row:
        raise HTTPException(404, "Escrow not found")
    return row


@app.post("/escrow/{eid}/update")
def api_update_escrow(eid: str, fields: dict):
    return update_escrow(eid, **fields)


@app.get("/escrows")
def api_list_escrows(limit: int = 100):
    return list_escrows(limit)


@app.post("/auth/user")
def api_create_user(body: UserIn):
    u = create_user(body.name, body.email, body.password)
    if not u:
        raise HTTPException(400, "Email taken or password invalid")
    return u


@app.post("/auth/verify")
def api_verify_user(body: UserIn):
    u = verify_user(body.email, body.password)
    if not u:
        raise HTTPException(401, "Invalid credentials")
    return u


@app.post("/auth/session")
def api_create_session(body: SessionIn):
    token = create_session(body.email)
    return {"token": token, "email": body.email}


@app.get("/auth/session/{token}")
def api_get_session(token: str):
    email = get_session_email(token)
    if not email:
        raise HTTPException(401, "Invalid session")
    return {"email": email}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
