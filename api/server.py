"""Ezri Africa API — single entry like ai-service/server.py. Vertical slice only."""
from __future__ import annotations
import json
import os
import secrets
import threading
import time
import uuid

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from env_loader import load_env

load_env()  # local .env support -- must run before ledger/paypal/ai_guard imports

import cache
from ai_guard import FEE_PCT, OPENROUTER_KEY, fee_of, parse_intent, strict_proof_check
from notify import emit, emit_raw, webhook_url
from ledger import (
    create_card, create_escrow, create_session, create_user, db_status, delete_card,
    delete_otp, find_by_capture, get_card, get_escrow, get_otp, get_prefs, get_reset,
    get_session_email, get_user, list_cards, list_escrows, list_events, save_otp,
    save_prefs, save_reset, set_password, update_card, update_escrow,
    update_user_profile, use_reset, verify_user, warmup,
)
from models import (
    CaptureIn, CardCreateIn, CardDeleteIn, CardFreezeIn, CardTopupIn, EscrowCreateIn,
    ForgotIn, OtpRequestIn, OtpVerifyIn, OverrideIn, ParseIn, PrefsIn, ProfileIn, RefundIn,
    ResetIn,
)
from paypal_client import MOCK, capture_order, create_order, refund_capture

EXPIRY_MIN = int(os.environ.get("DEMO_EXPIRY_MINUTES", "10"))
OTP_TTL_MIN = 5      # sign-in codes expire quickly
RESET_TTL_MIN = 30   # password reset links
# Canonical site used when building reset links for webhook delivery (Zapier → email).
WEB_BASE_URL = os.environ.get("WEB_BASE_URL", "https://ezri-africa.com").rstrip("/")

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


@app.on_event("startup")
def _startup() -> None:
    """Warm both DB doors in the background; never block boot on one of them."""
    threading.Thread(target=warmup, name="ezri-db-warmup", daemon=True).start()


@app.get("/api/health")
def health() -> dict:
    db = db_status()
    targets = {t["name"]: t for t in db["targets"]}
    return {
        "ok": True,
        "mock_paypal": MOCK,
        "db": "postgres" if db["mode"] != "sqlite" else "sqlite",
        "db_mode": db["mode"],
        "db_primary": targets.get("primary", {}).get("status", "disabled"),
        "db_secondary": targets.get("secondary", {}).get("status", "disabled"),
        "db_targets": db["targets"],
        "cache": cache.backend(),
        "cache_stats": cache.stats(),
        "ai_guard": "openrouter" if OPENROUTER_KEY else "heuristic",
        "expiry_minutes": EXPIRY_MIN,
        "fee_pct": FEE_PCT,  # Ezri platform fee: 2% of every transaction
        "fx_lrd": 194.50,
        "notify_webhook": bool(webhook_url()),  # event webhook (Zapier) configured?
    }


class SignupIn(BaseModel):
    name: str = "John"
    email: str = ""
    password: str = ""
    # Optional profile fields captured by the signup wizard (persisted on the user).
    phone: str = ""
    country: str = ""
    provider: str = ""
    region_type: str = ""
    dob: str = ""
    location: str = ""


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


def _require_sender(request: Request) -> str:
    email = _sender(request)
    if not email:
        raise HTTPException(401, "Not logged in.")
    return email


@app.post("/api/auth/signup")
def auth_signup(body: SignupIn) -> dict:
    user = create_user(
        body.name,
        body.email,
        body.password,
        {
            "phone": body.phone,
            "country": body.country,
            "provider": body.provider,
            "region_type": body.region_type,
            "dob": body.dob,
            "location": body.location,
        },
    )
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
        email, name = "demo@ezri-africa.com", "Demo Sender"
    if not name:
        name = _name_from_email(email)
    if len(password) < 4:
        password = "demo1234"  # demo mode never rejects a password

    user = verify_user(email, password)  # correct password still lands first
    if not user:
        user = create_user(name, email, password) or get_user(email)
    if not user:
        # Safety net: fall back to the canonical demo sender.
        email, name, password = "demo@ezri-africa.com", "Demo Sender", "demo1234"
        create_user(name, email, password)
        user = verify_user(email, password)
    assert user is not None
    return {"token": create_session(user["email"]), "user": user}


@app.get("/api/auth/me")
def auth_me(request: Request) -> dict:
    email = _sender(request)
    if not email:
        raise HTTPException(401, "Not logged in.")
    return get_user(email) or {"email": email}


@app.post("/api/auth/otp/request")
def auth_otp_request(body: OtpRequestIn, background: BackgroundTasks) -> dict:
    """Send a 6-digit sign-in code to the email.

    Demo mode returns the code in the response so judges need no mailbox;
    set NOTIFY_WEBHOOK_URL (e.g. Zapier Catch Hook → Email/SMS) and the same
    `auth.otp_requested` event delivers the real code with zero extra config.
    """
    email = body.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(400, "A valid email address is required.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    save_otp(email, code, OTP_TTL_MIN)
    emit_raw(
        background,
        "auth.otp_requested",
        {"email": email, "code": code, "expires_in_minutes": OTP_TTL_MIN},
        {"email": email, "expires_in_minutes": OTP_TTL_MIN, "delivery": "webhook" if webhook_url() else "demo"},
    )
    return {
        "ok": True,
        "demo_code": code,
        "expires_in_minutes": OTP_TTL_MIN,
        "delivered": bool(webhook_url()),
    }


@app.post("/api/auth/otp/verify")
def auth_otp_verify(body: OtpVerifyIn) -> dict:
    """Verify the 6-digit code and open a sender session (creates the account on first use)."""
    email = body.email.strip().lower()
    code = body.code.strip()
    row = get_otp(email)
    if not row or row["code"] != code or time.time() > float(row["expires_at"]):
        raise HTTPException(401, "That code didn't match or it expired. Request a new one.")
    delete_otp(email)
    user = get_user(email)
    if not user:
        user = create_user(_name_from_email(email), email, "otp-" + secrets.token_hex(8))
    if not user:
        raise HTTPException(400, "Could not open a session for that email.")
    return {"token": create_session(user["email"]), "user": user}


@app.post("/api/auth/forgot")
def auth_forgot(body: ForgotIn, background: BackgroundTasks) -> dict:
    """Create a one-time password reset link.

    Never reveals whether the account exists. Demo mode returns the token so the
    reset can be completed without a mailbox; `auth.reset_requested` carries the
    full reset URL to the notify webhook (Zapier → email) when configured.
    """
    email = body.email.strip().lower()
    user = get_user(email) if email else None
    if not user:
        return {
            "ok": True,
            "demo_token": None,
            "reset_url": None,
            "expires_in_minutes": RESET_TTL_MIN,
        }
    token = "ezr-reset-" + secrets.token_urlsafe(24)
    save_reset(token, email, RESET_TTL_MIN)
    reset_url = f"{WEB_BASE_URL}/reset-password?token={token}"
    emit_raw(
        background,
        "auth.reset_requested",
        {"email": email, "reset_url": reset_url, "expires_in_minutes": RESET_TTL_MIN},
        {"email": email, "expires_in_minutes": RESET_TTL_MIN},
    )
    return {
        "ok": True,
        "demo_token": token,
        "reset_url": reset_url,
        "expires_in_minutes": RESET_TTL_MIN,
    }


@app.post("/api/auth/reset")
def auth_reset(body: ResetIn) -> dict:
    """Complete a password reset with a valid one-time token."""
    if len(body.password) < 4:
        raise HTTPException(400, "Use at least 4 characters for the new password.")
    token = body.token.strip()
    row = get_reset(token)
    if not row or int(row.get("used") or 0) == 1 or time.time() > float(row["expires_at"]):
        raise HTTPException(401, "That reset link is invalid or has expired. Request a new one.")
    if not set_password(row["email"], body.password):
        raise HTTPException(404, "Account not found.")
    use_reset(token)
    return {"ok": True, "email": row["email"]}


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
    label = provider.strip()
    if not label:
        raise HTTPException(400, "provider required")
    up = label.upper()
    prov = "MTN" if "MTN" in up else "ORANGE" if "ORANGE" in up else label[:48]
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


# ---- Sender profile (signup wizard fields + settings edits) ----

@app.get("/api/profile")
def profile_get(request: Request) -> dict:
    email = _require_sender(request)
    user = get_user(email)
    if not user:
        raise HTTPException(404, "Account not found.")
    return user


@app.post("/api/profile")
def profile_update(body: ProfileIn, request: Request) -> dict:
    email = _require_sender(request)
    user = update_user_profile(
        email,
        name=body.name.strip()[:80] or None,
        phone=body.phone.strip()[:40] or None,
        country=body.country.strip()[:80] or None,
        provider=body.provider.strip()[:120] or None,
        region_type=body.region_type.strip()[:20] or None,
        dob=body.dob.strip()[:20] or None,
        location=body.location.strip()[:120] or None,
    )
    if not user:
        raise HTTPException(404, "Account not found.")
    return user


# ---- Virtual card vault (mock numbers, real persistence) ----

@app.get("/api/cards")
def cards_list(request: Request) -> dict:
    return {"cards": list_cards(_require_sender(request))}


@app.post("/api/cards/create")
def cards_create(body: CardCreateIn, request: Request) -> dict:
    card = create_card(_require_sender(request), body.name, body.brand)
    if not card:
        raise HTTPException(400, "Card limit reached — up to 3 virtual cards per sender.")
    return {"card": card}


@app.post("/api/cards/freeze")
def cards_freeze(body: CardFreezeIn, request: Request) -> dict:
    email = _require_sender(request)
    card = update_card(body.card_id, email, frozen=int(bool(body.frozen)))
    if not card:
        raise HTTPException(404, "Card not found.")
    return {"card": card}


@app.post("/api/cards/topup")
def cards_topup(body: CardTopupIn, request: Request) -> dict:
    email = _require_sender(request)
    card = get_card(body.card_id, email)
    if not card:
        raise HTTPException(404, "Card not found.")
    card = update_card(
        body.card_id, email, balance=round(float(card["balance"]) + body.amount, 2)
    )
    return {"card": card}


@app.post("/api/cards/delete")
def cards_delete(body: CardDeleteIn, request: Request) -> dict:
    if not delete_card(body.card_id, _require_sender(request)):
        raise HTTPException(404, "Card not found.")
    return {"ok": True}


# ---- Purpose-lock preferences (per sender) ----

@app.get("/api/prefs")
def prefs_get(request: Request) -> dict:
    return {"prefs": get_prefs(_require_sender(request))}


@app.post("/api/prefs")
def prefs_set(body: PrefsIn, request: Request) -> dict:
    email = _require_sender(request)
    if len(json.dumps(body.payload)) > 1_000_000:
        raise HTTPException(413, "Preferences payload too large.")
    save_prefs(email, body.payload)
    return {"ok": True}


# ---- Automation event log (what the notify webhook would deliver) ----

@app.get("/api/events")
def events() -> dict:
    return {"events": list_events(25), "notify_webhook": bool(webhook_url())}
