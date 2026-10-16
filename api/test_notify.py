"""Unit tests for the outbound event webhook (api/notify.py).

Pure payload + failure-safety tests only — no network, no DB.
"""
from fastapi import BackgroundTasks

from notify import build_event, emit, post_event


def _row(**over):
    base = {
        "id": "EZR-TEST",
        "status": "RELEASED",
        "tag": "SCHOOL",
        "amount_usd": 60.0,
        "fee_usd": 1.2,
        "provider": "MTN",
        "provider_number": "0881234567",
        "verdict": "PASS",
        "verdict_reason": "ok",
        "paypal_order_id": "ORDER-1",
        "paypal_capture_id": "CAP-1",
        "mock_momo_txn_id": "MOCK-MOMO-AB12CD34",
    }
    base.update(over)
    return base


def test_build_event_money_math_and_fields():
    payload = build_event(_row(), {"mock_momo_txn_id": "MOCK-MOMO-AB12CD34"})
    assert payload["escrow_id"] == "EZR-TEST"
    assert payload["status"] == "RELEASED"
    assert payload["tag"] == "SCHOOL"
    assert payload["amount_usd"] == 60.0
    assert payload["fee_usd"] == 1.2
    assert payload["total_usd"] == 61.2
    assert payload["provider"] == "MTN"
    assert payload["mock_momo_txn_id"] == "MOCK-MOMO-AB12CD34"
    assert payload["occurred_at"].endswith("Z")


def test_build_event_tolerates_sparse_rows():
    payload = build_event({"id": "EZR-X"})
    assert payload["total_usd"] == 0
    assert payload["status"] is None


def test_post_event_noop_without_url(monkeypatch):
    monkeypatch.delenv("NOTIFY_WEBHOOK_URL", raising=False)
    assert post_event("transfer.held", build_event(_row())) is False


def test_post_event_never_raises_on_connection_refused(monkeypatch):
    # Nothing listens on port 9 — must return False, not raise.
    monkeypatch.setenv("NOTIFY_WEBHOOK_URL", "http://127.0.0.1:9/hook")
    assert post_event("transfer.held", build_event(_row())) is False


def test_emit_schedules_background_task_without_raising(monkeypatch):
    monkeypatch.delenv("NOTIFY_WEBHOOK_URL", raising=False)
    bg = BackgroundTasks()
    emit(bg, "proof.failed", _row(status="NEEDS_RETRY"), {"reason": "blurry"})
    assert len(bg.tasks) == 1


def test_emit_without_background_never_raises(monkeypatch):
    monkeypatch.delenv("NOTIFY_WEBHOOK_URL", raising=False)
    emit(None, "transfer.created", _row(status="DRAFT"))
