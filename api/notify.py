"""Outbound escrow event webhook (Zapier-ready notifications).

Set NOTIFY_WEBHOOK_URL to an HTTPS endpoint (a Zapier "Catch Hook", Make,
webhook.site for live demo inspection) and every escrow lifecycle event is
POSTed there as JSON. Unset = silent no-op, so judges run with zero config.

Events:
  transfer.created | transfer.held | transfer.released | transfer.refunded
  transfer.overridden | transfer.expired
  proof.passed | proof.failed

Delivery is best-effort and never breaks money movement: short timeout,
all errors swallowed, sent via FastAPI BackgroundTasks (after the response).
"""
from __future__ import annotations

import os
import time

import httpx
from fastapi import BackgroundTasks

TIMEOUT_SECONDS = 4


def webhook_url() -> str:
    return os.environ.get("NOTIFY_WEBHOOK_URL", "").strip()


def build_event(row: dict, extra: dict | None = None) -> dict:
    """Pure payload builder — unit tested, no I/O."""
    amount = float(row.get("amount_usd") or 0)
    fee = float(row.get("fee_usd") or 0)
    payload = {
        "escrow_id": row.get("id"),
        "status": row.get("status"),
        "tag": row.get("tag"),
        "amount_usd": amount,
        "fee_usd": fee,
        "total_usd": round(amount + fee, 2),
        "provider": row.get("provider"),
        "provider_number": row.get("provider_number"),
        "verdict": row.get("verdict"),
        "verdict_reason": row.get("verdict_reason"),
        "paypal_order_id": row.get("paypal_order_id"),
        "paypal_capture_id": row.get("paypal_capture_id"),
        "mock_momo_txn_id": row.get("mock_momo_txn_id"),
        "occurred_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if extra:
        payload.update(extra)
    return payload


def post_event(event: str, payload: dict) -> bool:
    """POST one event. Returns False (never raises) when unconfigured or failing."""
    url = webhook_url()
    if not url:
        return False
    try:
        response = httpx.post(url, json={"event": event, **payload}, timeout=TIMEOUT_SECONDS)
        return 200 <= response.status_code < 300
    except Exception:
        return False


def emit(
    background: BackgroundTasks | None,
    event: str,
    row: dict,
    extra: dict | None = None,
) -> None:
    """Schedule (or directly send) an event for an escrow row. Never raises."""
    try:
        payload = build_event(row, extra)
        if background is None:
            post_event(event, payload)
        else:
            background.add_task(post_event, event, payload)
    except Exception:
        pass
