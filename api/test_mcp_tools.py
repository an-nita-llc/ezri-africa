"""MCP tool tests: PIN-gated escrow actions as agent tools. Run: pytest -q"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
# Same isolated DB as the vertical slice (suite shares one test database;
# every test below operates on its own escrow IDs, never on row counts).
os.environ["EZRI_DB"] = os.path.join(os.path.dirname(__file__), "test_ezri.db")

import pytest

import mcp_tools
from mcp_tools import (
    capture_held_funds,
    create_escrow_transfer,
    get_escrow_status,
    propose_transfer,
    refund_escrow,
    release_after_override,
)

PIN = "1234"


@pytest.fixture(autouse=True)
def _no_webhook(monkeypatch):
    monkeypatch.delenv("NOTIFY_WEBHOOK_URL", raising=False)


def test_tools_registered_on_server():
    assert len(mcp_tools.mcp._tool_manager._tools) == 6


def test_propose_transfer_read_only():
    out = asyncio.run(propose_transfer("Send $60 to mom for school fees"))
    assert out["ok"] is True
    assert out["tag"] == "SCHOOL" and out["amount_usd"] == 60.0
    assert out["fee_usd"] == 1.2 and out["total_usd"] == 61.2
    assert "create_escrow" in out["next_step"]


def test_money_tools_reject_wrong_pin():
    out = asyncio.run(
        create_escrow_transfer(60, "SCHOOL", "fees", "mom", "agent@demo.africa", "0000")
    )
    assert out["ok"] is False and "PIN" in out["error"]
    assert asyncio.run(refund_escrow("EZR-NOPE", "0000"))["ok"] is False
    assert get_escrow_status("EZR-NOPE")["ok"] is False  # read-only, no PIN needed


def test_create_rejects_bad_tag_and_amount():
    out = asyncio.run(
        create_escrow_transfer(60, "PARTY", "fun", "mom", "agent@demo.africa", PIN)
    )
    assert out["ok"] is False and "SCHOOL" in out["error"]
    out = asyncio.run(
        create_escrow_transfer(0, "FOOD", "rice", "mom", "agent@demo.africa", PIN)
    )
    assert out["ok"] is False


def test_full_agent_lifecycle_create_capture_override_refund():
    created = asyncio.run(
        create_escrow_transfer(45, "FOOD", "rice and oil", "mom", "agent@demo.africa", PIN)
    )
    assert created["ok"] is True
    eid = created["escrow_id"]
    assert created["status"] == "DRAFT" and created["fee_usd"] == 0.9

    held = asyncio.run(capture_held_funds(eid, PIN))
    assert held["status"] == "HELD" and held["capture_id"].startswith("MOCK-CAPTURE-")

    status = get_escrow_status(eid)
    assert status["status"] == "HELD" and status["total_usd"] == 45.9

    released = asyncio.run(release_after_override(eid, "agent verified by phone", PIN))
    assert released["status"] == "RELEASED"
    assert released["mock_momo_txn_id"].startswith("MOCK-MOMO-")

    refunded = asyncio.run(refund_escrow(eid, PIN))
    assert refunded["status"] == "REFUNDED"
    assert refunded["refunded_usd"] == 45.9
    # Idempotent second refund
    again = asyncio.run(refund_escrow(eid, PIN))
    assert again["status"] == "REFUNDED" and "refunded_usd" not in again
