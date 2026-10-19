"""Ezri Africa API — single entry like ai-service/server.py. Vertical slice only."""
from __future__ import annotations
import os
import time
import uuid

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ai_guard import FEE_PCT, fee_of, parse_intent, strict_proof_check
from notify import emit, webhook_url
from ledger import (
    create_escrow, create_session, create_user, find_by_capture,
    get_escrow, get_session_email, get_user, list_escrows, update_escrow, verify_user,
)
from models import CaptureIn, EscrowCreateIn, OverrideIn, ParseIn, RefundIn
from paypal_client import MOCK, capture_order, create_order, refund_capture

EXPIRY_MIN = int(os.environ.get("DEMO_EXPIRY_MINUTES", "10"))

# CORS allowlist (demo): explicit origins only — never "*" with credentials.
# Override with CORS_ALLOWED_ORIGINS in production (Render sets it).
_origins_env = os.environ.get("CORS_ALLOWED_ORIGINS", "")
_CORS_ORIGINS = [
    o.strip()
    for o in (
        _origins_env
        or "https://ezri-africa.com,https://www.ezri-africa.com,https://ezri-africa.onrender.com"
    ).split(",")
    if o.strip() and o.strip() != "*"
] or ["https://ezri-africa.com"]

app = FastAPI(
    title="Ezri Africa — Proof Before Payout API",
    version="0.1.0",
    description=(
        "Purpose-locked P2P escrow for Africa: PayPal in, AI-guarded prove-first "
        "verification, mobile-money out (mock). Import /openapi.json into APIMatic "
        "to generate the hosted docs + SDK portal."
    ),
    contact={"name": "Annita LLC", "email": "annitallc@gmail.com"},
    license_info={"name": "MIT"},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "ok": True,
        "mock_paypal": MOCK,
        "expiry_minutes": EXPIRY_MIN,
        "fee_pct": FEE_PCT,  # Ezri platform fee: 2% of every transaction
        "fx_lrd": 194.50,
        "notify_webhook": bool(webhook_url()),  # event webhook (Zapier) configured?
    }


class SignupIn(BaseModel):
    name: str = "John"
    email: str = ""
    password: str = ""


class LoginIn(BaseModel):
    email: str = ""
    password: str = ""


class DemoIn(BaseModel):
    """Any credentials open a demo session — embedded in the sign-in form."""

    email: str = ""
    password: str = ""
    name: str = ""


def _sender(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        return get_session_email(auth[7:].strip())
    return ""


@app.post("/api/auth/signup")
def auth_signup(body: SignupIn) -> dict:
    user = create_user(body.name, body.email, body.password)
    if not user:
        raise HTTPException(400, "Email taken or password too short (min 4).")
    return {"token": create_session(user["email"]), "user": user}


@app.post("/api/auth/login")
def auth_login(body: LoginIn) -> dict:
    user = verify_user(body.email, body.password)
    if not user:
        raise HTTPException(401, "Wrong email or password.")
    return {"token": create_session(user["email"]), "user": user}


def _name_from_email(email: str) -> str:
    """'john.doe@example.com' -> 'John Doe' so the agent can greet by name."""
    local = email.split("@", 1)[0]
    words = local.replace(".", " ").replace("_", " ").replace("-", " ").split()
    name = " ".join(w.capitalize() for w in words if w)
    return name[:80] or "Sender"


@app.post("/api/auth/demo")
def auth_demo(body: DemoIn | None = None) -> dict:
    """Demo login: ANY email + password opens a session. Creates the sender on the fly.

    Works with no body (one-tap button) or {email, password} from the sign-in form.
    """
    email = (body.email if body else "").strip().lower()
    password = (body.password if body else "")
    name = (body.name if body else "").strip()

    if not email:
        # One-tap path — canonical judge identity.
        email, name = "demo@ezri.africa", "Demo Sender"
    if not name:
        name = _name_from_email(email)
    if len(password) < 4:
        password = "demo1234"  # demo mode never rejects a password

    user = verify_user(email, password)  # correct password still lands first
    if not user:
        user = create_user(name, email, password) or get_user(email)
    if not user:
        # Safety net: fall back to the canonical demo sender.
        email, name, password = "demo@ezri.africa", "Demo Sender", "demo1234"
        create_user(name, email, password)
        user = verify_user(email, password)
    assert user is not None
    return {"token": create_session(user["email"]), "user": user}


@app.get("/api/auth/me")
def auth_me(request: Request) -> dict:
    email = _sender(request)
    if not email:
        raise HTTPException(401, "Not logged in.")
    return {"email": email}


@app.post("/api/chat/parse")
async def chat_parse(body: ParseIn) -> dict:
    return await parse_intent(body.text, body.note)


@app.post("/api/escrow/create")
async def escrow_create(
    body: EscrowCreateIn, request: Request, background: BackgroundTasks
) -> dict:
    fee = fee_of(body.amount_usd)          # 2% Ezri service fee
    total = round(body.amount_usd + fee, 2)  # what PayPal actually charges the sender
    order = await create_order(total)
    row = create_escrow(body.amount_usd, body.tag, body.note, body.recipient, EXPIRY_MIN, _sender(request))
    row = update_escrow(row["id"], paypal_order_id=order["order_id"])
    emit(background, "transfer.created", row,
         {"paypal_order_id": order["order_id"], "approval_url": order["approval_url"]})
    return {
        "escrow_id": row["id"],
        "paypal_order_id": order["order_id"],
        "approval_url": order["approval_url"],
        "status": row["status"],
        "expires_in_minutes": EXPIRY_MIN,
        "amount_usd": row["amount_usd"],
        "fee_usd": row["fee_usd"],
        "fee_pct": FEE_PCT * 100,
        "total_usd": round(row["amount_usd"] + row["fee_usd"], 2),
    }


@app.post("/api/escrow/capture")
async def escrow_capture(body: CaptureIn, background: BackgroundTasks) -> dict:
    row = get_escrow(body.escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    order_id = body.paypal_order_id or row["paypal_order_id"]
    cap = await capture_order(order_id)
    was_held = row["status"] == "HELD"
    row = update_escrow(row["id"], paypal_order_id=order_id, paypal_capture_id=cap["capture_id"], status="HELD")
    if not was_held:
        emit(background, "transfer.held", row, {"capture_id": cap["capture_id"]})
    return {"escrow_id": row["id"], "status": "HELD", "capture_id": cap["capture_id"]}


@app.post("/api/escrow/prove")
async def escrow_prove(
    background: BackgroundTasks,
    escrow_id: str = Form(...),
    provider: str = Form(...),
    provider_number: str = Form(...),
    note: str = Form(""),
    proof: UploadFile = File(...),
) -> dict:
    row = get_escrow(escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] not in ("HELD", "NEEDS_RETRY", "DRAFT"):
        raise HTTPException(400, f"cannot prove in status {row['status']}")
    prov = provider.upper()
    if prov not in ("ORANGE", "MTN"):
        raise HTTPException(400, "provider must be ORANGE or MTN")
    data = await proof.read()
    verdict, reason = strict_proof_check(row["tag"], row["amount_usd"], proof.filename or "", len(data), f"{note} {row['note']}")
    if verdict == "PASS":
        momo = "MOCK-MOMO-" + uuid.uuid4().hex[:8].upper()
        row = update_escrow(
            escrow_id, provider=prov, provider_number=provider_number,
            verdict="PASS", verdict_reason=reason, mock_momo_txn_id=momo, status="RELEASED",
        )
        emit(background, "proof.passed", row, {"reason": reason, "provider": prov})
        emit(background, "transfer.released", row, {"mock_momo_txn_id": momo})
        return {"escrow_id": escrow_id, "status": "RELEASED", "verdict": "PASS",
                "reason": reason, "provider": prov, "mock_momo_txn_id": momo}
    row = update_escrow(escrow_id, provider=prov, provider_number=provider_number,
                        verdict="FAIL", verdict_reason=reason, status="NEEDS_RETRY")
    emit(background, "proof.failed", row, {"reason": reason, "provider": prov})
    return {"escrow_id": escrow_id, "status": "NEEDS_RETRY", "verdict": "FAIL",
            "reason": reason, "provider": prov, "mock_momo_txn_id": None}


@app.post("/api/escrow/override")
def escrow_override(body: OverrideIn, background: BackgroundTasks) -> dict:
    row = get_escrow(body.escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] not in ("NEEDS_RETRY", "HELD"):
        raise HTTPException(400, f"cannot override in status {row['status']}")
    momo = "MOCK-MOMO-" + uuid.uuid4().hex[:8].upper()
    row = update_escrow(body.escrow_id, verdict="PASS",
                        verdict_reason=f"Sender override: {body.reason}",
                        mock_momo_txn_id=momo, status="RELEASED")
    emit(background, "transfer.overridden", row,
         {"reason": body.reason, "mock_momo_txn_id": momo})
    return {"escrow_id": row["id"], "status": "RELEASED", "mock_momo_txn_id": momo}


@app.post("/api/escrow/refund")
async def escrow_refund(body: RefundIn, background: BackgroundTasks) -> dict:
    row = get_escrow(body.escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] == "REFUNDED":
        return {"escrow_id": row["id"], "status": "REFUNDED"}
    # Refund what was captured: transfer amount + the 2% fee charged on top.
    charged = round(row["amount_usd"] + float(row.get("fee_usd") or 0), 2)
    out = await refund_capture(row.get("paypal_capture_id", ""), charged)
    row = update_escrow(row["id"], status="REFUNDED")
    emit(background, "transfer.refunded", row,
         {"refund_id": out["refund_id"], "refunded_usd": charged})
    return {"escrow_id": row["id"], "status": "REFUNDED", "refund_id": out["refund_id"], "refunded_usd": charged}


@app.get("/api/escrow/{eid}")
def escrow_get(eid: str, background: BackgroundTasks) -> dict:
    row = get_escrow(eid)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] in ("HELD", "NEEDS_RETRY", "DRAFT") and time.time() > row["expires_at"]:
        row = update_escrow(eid, status="EXPIRED")
        emit(background, "transfer.expired", row)
    return row


@app.post("/api/webhooks/paypal")
async def paypal_webhook(request: Request, background: BackgroundTasks) -> dict:
    """PayPal event receiver. Sandbox: configure webhook URL in developer dashboard.
    Mock mode: hit directly with the JSON below (see postman collection).
    SECURITY NOTE (demo only): no signature verification here — do NOT reuse
    this handler in production. Production wallet webhooks fail closed without
    a secret (see wallet/controllers/wallet_payment_api.py:1031)."""
    try:
        event = await request.json()
    except Exception:
        raise HTTPException(400, "invalid json")
    etype = str(event.get("event_type", ""))
    res = event.get("resource", {}) or {}
    cap_id = str(res.get("id", ""))
    if etype == "PAYMENT.CAPTURE.COMPLETED" and cap_id:
        row = find_by_capture(cap_id)
        if row and row["status"] == "DRAFT":
            row = update_escrow(row["id"], status="HELD")
            emit(background, "transfer.held", row, {"capture_id": cap_id})
    elif etype in ("PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED") and cap_id:
        row = find_by_capture(cap_id)
        if row and row["status"] != "REFUNDED":
            row = update_escrow(row["id"], status="REFUNDED")
            emit(background, "transfer.refunded", row, {"capture_id": cap_id})
    return {"ok": True, "event": etype}


@app.get("/api/dashboard")
def dashboard(q: str = "") -> dict:
    rows = list_escrows()
    s = q.strip().lower()
    if s:
        if "risk" in s:
            rows = [r for r in rows if r["status"] in ("NEEDS_RETRY", "EXPIRED")]
        elif "school" in s or "food" in s or "health" in s:
            rows = [r for r in rows if r["tag"].lower() == s.split()[0]]
        else:
            rows = [r for r in rows if s in (r["note"] + r["recipient"] + r["tag"]).lower()]
    return {"count": len(rows), "rows": rows, "mock_paypal": MOCK}
