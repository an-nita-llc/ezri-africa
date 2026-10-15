"""Ezri Africa API — single entry like ai-service/server.py. Vertical slice only."""
from __future__ import annotations
import os
import time
import uuid

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from ai_guard import parse_intent, strict_proof_check
from ledger import create_escrow, find_by_capture, get_escrow, list_escrows, update_escrow
from models import CaptureIn, EscrowCreateIn, OverrideIn, ParseIn, RefundIn
from paypal_client import MOCK, capture_order, create_order, refund_capture

EXPIRY_MIN = int(os.environ.get("DEMO_EXPIRY_MINUTES", "10"))

app = FastAPI(title="Ezri Africa — PayPal AI bridge (Liberia pilot)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "mock_paypal": MOCK, "expiry_minutes": EXPIRY_MIN}


@app.post("/api/chat/parse")
async def chat_parse(body: ParseIn) -> dict:
    return await parse_intent(body.text, body.note)


@app.post("/api/escrow/create")
async def escrow_create(body: EscrowCreateIn) -> dict:
    order = await create_order(body.amount_usd)
    row = create_escrow(body.amount_usd, body.tag, body.note, body.recipient, EXPIRY_MIN)
    row = update_escrow(row["id"], paypal_order_id=order["order_id"])
    return {
        "escrow_id": row["id"],
        "paypal_order_id": order["order_id"],
        "approval_url": order["approval_url"],
        "status": row["status"],
        "expires_in_minutes": EXPIRY_MIN,
    }


@app.post("/api/escrow/capture")
async def escrow_capture(body: CaptureIn) -> dict:
    row = get_escrow(body.escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    order_id = body.paypal_order_id or row["paypal_order_id"]
    cap = await capture_order(order_id)
    row = update_escrow(row["id"], paypal_order_id=order_id, paypal_capture_id=cap["capture_id"], status="HELD")
    return {"escrow_id": row["id"], "status": "HELD", "capture_id": cap["capture_id"]}


@app.post("/api/escrow/prove")
async def escrow_prove(
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
        return {"escrow_id": escrow_id, "status": "RELEASED", "verdict": "PASS",
                "reason": reason, "provider": prov, "mock_momo_txn_id": momo}
    row = update_escrow(escrow_id, provider=prov, provider_number=provider_number,
                        verdict="FAIL", verdict_reason=reason, status="NEEDS_RETRY")
    return {"escrow_id": escrow_id, "status": "NEEDS_RETRY", "verdict": "FAIL",
            "reason": reason, "provider": prov, "mock_momo_txn_id": None}


@app.post("/api/escrow/override")
def escrow_override(body: OverrideIn) -> dict:
    row = get_escrow(body.escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] not in ("NEEDS_RETRY", "HELD"):
        raise HTTPException(400, f"cannot override in status {row['status']}")
    momo = "MOCK-MOMO-" + uuid.uuid4().hex[:8].upper()
    row = update_escrow(body.escrow_id, verdict="PASS",
                        verdict_reason=f"Sender override: {body.reason}",
                        mock_momo_txn_id=momo, status="RELEASED")
    return {"escrow_id": row["id"], "status": "RELEASED", "mock_momo_txn_id": momo}


@app.post("/api/escrow/refund")
async def escrow_refund(body: RefundIn) -> dict:
    row = get_escrow(body.escrow_id)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] == "REFUNDED":
        return {"escrow_id": row["id"], "status": "REFUNDED"}
    out = await refund_capture(row.get("paypal_capture_id", ""), row["amount_usd"])
    row = update_escrow(row["id"], status="REFUNDED")
    return {"escrow_id": row["id"], "status": "REFUNDED", "refund_id": out["refund_id"]}


@app.get("/api/escrow/{eid}")
def escrow_get(eid: str) -> dict:
    row = get_escrow(eid)
    if not row:
        raise HTTPException(404, "escrow not found")
    if row["status"] in ("HELD", "NEEDS_RETRY", "DRAFT") and time.time() > row["expires_at"]:
        row = update_escrow(eid, status="EXPIRED")
    return row


@app.post("/api/webhooks/paypal")
async def paypal_webhook(request: Request) -> dict:
    """PayPal event receiver. Sandbox: configure webhook URL in developer dashboard.
    Mock mode: hit directly with the JSON below (see postman collection)."""
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
            update_escrow(row["id"], status="HELD")
    elif etype in ("PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED") and cap_id:
        row = find_by_capture(cap_id)
        if row and row["status"] != "REFUNDED":
            update_escrow(row["id"], status="REFUNDED")
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
