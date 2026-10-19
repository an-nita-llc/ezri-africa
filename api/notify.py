"""Outbound escrow event webhook (Zapier-ready notifications).

Set NOTIFY_WEBHOOK_URL to an HTTPS endpoint (a Zapier "Catch Hook", Make,
webhook.site for live demo inspection) and every escrow lifecycle event is
POSTed there as JSON. Unset = silent no-op, so judges run with zero config.

Events:
  transfer.created | transfer.held | transfer.released | transfer.refunded
  transfer.overridden | transfer.expired
  proof.passed | proof.failed
  auth.otp_requested | auth.reset_requested

Every event is also recorded in the ledger `events` table (local audit trail,
shown in Settings), so the automation story stays visible with zero config.
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


def _record(event: str, payload: dict) -> None:
    """Local audit trail: every event lands in the ledger `events` table so the
    app can show live automation activity even when no webhook is configured."""
    try:
        from ledger import add_event

        add_event(event, payload)
    except Exception:
        pass


def emit(
    background: BackgroundTasks | None,
    event: str,
    row: dict,
    extra: dict | None = None,
) -> None:
    """Schedule (or directly send) an event for an escrow row. Never raises."""
    try:
        payload = build_event(row, extra)
        _record(event, payload)
        if background is None:
            post_event(event, payload)
        else:
            background.add_task(post_event, event, payload)
    except Exception:
        pass


def emit_raw(
    background: BackgroundTasks | None,
    event: str,
    payload: dict,
    record_payload: dict | None = None,
) -> None:
    """Emit a non-escrow event (auth.otp_requested, auth.reset_requested, ...).

    `record_payload` (when given) is what lands in the public event log; the
    full `payload` is only what the configured webhook receives, so secrets
    like OTP codes and reset tokens never leak through /api/events.
    """
    try:
        _record(event, record_payload if record_payload is not None else payload)
        if background is None:
            post_event(event, payload)
        else:
            background.add_task(post_event, event, payload)
    except Exception:
        pass
