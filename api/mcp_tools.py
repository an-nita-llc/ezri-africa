"""Ezri MCP tool server — escrow actions as agent-callable tools.

Agentic-commerce pattern behind the PayPal Agent Toolkit prize: an AI agent
doesn't just recommend, it transacts — through these tools, with the same
approval philosophy as the chat agent. Read-only tools are free; every tool
that commits or moves money requires the sender's 4-digit money PIN
(demo default ``1234`` via ``EZRI_MONEY_PIN`` — demo only; production binds
the PIN to the sender account server-side).

Stdio transport for local agents (MCP Inspector, Claude Desktop):

    python api/mcp_tools.py

The REST API + web chat stay the primary demo path; this server is the
machine-readable twin of the same escrow lifecycle (Render hosts API+web;
the MCP server runs locally over stdio).
"""
from __future__ import annotations

import os

from env_loader import load_env

load_env()  # local .env support -- before ledger/paypal/ai_guard read env

from mcp.server.fastmcp import FastMCP

from ai_guard import FEE_PCT, fee_of, parse_intent
from ledger import create_escrow, get_escrow, update_escrow
from notify import emit
from paypal_client import capture_order, create_order, refund_capture

mcp = FastMCP("ezri-africa-escrow")

EXPIRY_MIN = int(os.environ.get("DEMO_EXPIRY_MINUTES", "10"))
VALID_TAGS = ("FOOD", "SCHOOL", "HEALTH", "RENT", "EMERGENCY", "GENERAL")


def _money_pin() -> str:
    return os.environ.get("EZRI_MONEY_PIN", "1234")


def _pin_error() -> dict:
    return {
        "ok": False,
        "error": "Wrong money PIN. Ask the sender for the 4-digit money PIN "
        "(demo: 1234) and try again — money never moves without it.",
    }


def _escrow_card(row: dict) -> dict:
    amount = float(row.get("amount_usd") or 0)
    fee = float(row.get("fee_usd") or 0)
    return {
        "ok": True,
        "escrow_id": row.get("id"),
        "status": row.get("status"),
        "tag": row.get("tag"),
        "amount_usd": amount,
        "fee_usd": fee,
        "total_usd": round(amount + fee, 2),
        "fee_pct": FEE_PCT * 100,
        "provider": row.get("provider"),
        "verdict": row.get("verdict"),
        "mock_momo_txn_id": row.get("mock_momo_txn_id"),
    }


@mcp.tool()
async def propose_transfer(text: str, note: str = "") -> dict:
    """Parse a sender's natural-language request into a transfer proposal.

    Read-only: touches neither PayPal nor the ledger. Shows the tag, amount,
    2% fee, fraud score and what happens next. Call this first.
    """
    parsed = await parse_intent(text, note)
    amount = float(parsed.get("amount_usd") or 0)
    return {
        "ok": True,
        "intent": parsed.get("intent"),
        "reply": parsed.get("reply"),
        "tag": parsed.get("tag"),
        "amount_usd": amount,
        "fee_usd": fee_of(amount),
        "total_usd": round(amount + fee_of(amount), 2),
        "fraud_score": parsed.get("fraud_score"),
        "next_step": "If the sender approves, call create_escrow with their money PIN.",
    }


@mcp.tool()
async def create_escrow_transfer(
    amount_usd: float,
    tag: str,
    note: str,
    recipient: str,
    sender_email: str,
    sender_pin: str,
) -> dict:
    """Create a purpose-locked escrow + PayPal order (no capture yet).

    Requires the sender's money PIN. The receiver proves with a bill photo
    on the claim link before any payout; unproven escrow auto-refunds.
    """
    if sender_pin != _money_pin():
        return _pin_error()
    if amount_usd <= 0:
        return {"ok": False, "error": "amount_usd must be greater than 0."}
    clean_tag = (tag or "").upper()
    if clean_tag not in VALID_TAGS:
        return {"ok": False, "error": f"Unknown tag '{tag}'. Use one of: {', '.join(VALID_TAGS)}."}
    fee = fee_of(amount_usd)
    order = await create_order(round(amount_usd + fee, 2))
    row = create_escrow(amount_usd, clean_tag, note, recipient, EXPIRY_MIN, sender_email)
    row = update_escrow(row["id"], paypal_order_id=order["order_id"])
    emit(None, "transfer.created", row, {"paypal_order_id": order["order_id"]})
    card = _escrow_card(row)
    card["paypal_order_id"] = order["order_id"]
    card["approval_url"] = order["approval_url"]
    card["next_step"] = "Funds are NOT held yet — call capture_held_funds with the money PIN."
    return card


@mcp.tool()
async def capture_held_funds(escrow_id: str, sender_pin: str) -> dict:
    """Capture the PayPal order so funds move to HELD (escrow lock).

    Requires the sender's money PIN. After this, payout waits for the
    receiver's bill-photo proof on the claim link.
    """
    if sender_pin != _money_pin():
        return _pin_error()
    row = get_escrow(escrow_id)
    if not row:
        return {"ok": False, "error": f"Unknown escrow '{escrow_id}'."}
    if row["status"] == "HELD":
        card = _escrow_card(row)
        card["next_step"] = "Already HELD — share the claim link and wait for proof."
        return card
    cap = await capture_order(row.get("paypal_order_id") or "")
    row = update_escrow(row["id"], paypal_capture_id=cap["capture_id"], status="HELD")
    emit(None, "transfer.held", row, {"capture_id": cap["capture_id"]})
    card = _escrow_card(row)
    card["capture_id"] = cap["capture_id"]
    card["next_step"] = "Funds HELD. Payout waits for receiver proof (claim link)."
    return card


@mcp.tool()
def get_escrow_status(escrow_id: str) -> dict:
    """Read the current state of an escrow (read-only, no PIN needed)."""
    row = get_escrow(escrow_id)
    if not row:
        return {"ok": False, "error": f"Unknown escrow '{escrow_id}'."}
    return _escrow_card(row)


@mcp.tool()
async def release_after_override(escrow_id: str, reason: str, sender_pin: str) -> dict:
    """Release funds to the receiver despite a FAIL verdict (sender override).

    Requires the sender's money PIN plus a human reason. Used when the AI
    proof check fails but the sender vouches for the receiver.
    """
    if sender_pin != _money_pin():
        return _pin_error()
    row = get_escrow(escrow_id)
    if not row:
        return {"ok": False, "error": f"Unknown escrow '{escrow_id}'."}
    if row["status"] not in ("NEEDS_RETRY", "HELD"):
        return {"ok": False, "error": f"Cannot override while status is {row['status']}."}
    import uuid

    momo = "MOCK-MOMO-" + uuid.uuid4().hex[:8].upper()
    row = update_escrow(
        escrow_id,
        verdict="PASS",
        verdict_reason=f"Sender override via agent: {reason}",
        mock_momo_txn_id=momo,
        status="RELEASED",
    )
    emit(None, "transfer.overridden", row, {"reason": reason})
    return _escrow_card(row)


@mcp.tool()
async def refund_escrow(escrow_id: str, sender_pin: str) -> dict:
    """Refund the full charged amount (transfer + 2% fee) to the sender.

    Requires the sender's money PIN.
    """
    if sender_pin != _money_pin():
        return _pin_error()
    row = get_escrow(escrow_id)
    if not row:
        return {"ok": False, "error": f"Unknown escrow '{escrow_id}'."}
    if row["status"] == "REFUNDED":
        card = _escrow_card(row)
        card["next_step"] = "Already refunded — nothing left to do."
        return card
    charged = round(float(row.get("amount_usd") or 0) + float(row.get("fee_usd") or 0), 2)
    out = await refund_capture(row.get("paypal_capture_id", ""), charged)
    row = update_escrow(row["id"], status="REFUNDED")
    emit(None, "transfer.refunded", row, {"refund_id": out["refund_id"]})
    card = _escrow_card(row)
    card["refund_id"] = out["refund_id"]
    card["refunded_usd"] = charged
    return card


if __name__ == "__main__":
    mcp.run()
