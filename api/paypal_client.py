"""PayPal sandbox client with mock fallback so judges run with zero keys.

Real path (keys set): OAuth client_credentials -> Orders v2 create/capture -> Payments refunds.
Mock path (no keys): deterministic MOCK- ids + mock approval URL. Mock MoMo payout clearly labeled MOCK.
"""
from __future__ import annotations
import base64
import os
import uuid

import httpx

BASE = os.environ.get("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")
CID = os.environ.get("PAYPAL_CLIENT_ID", "")
SECRET = os.environ.get("PAYPAL_CLIENT_SECRET", "")

MOCK = not (CID and SECRET)


async def _token() -> str:
    auth = base64.b64encode(f"{CID}:{SECRET}".encode()).decode()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{BASE}/v1/oauth2/token",
            headers={"Authorization": f"Basic {auth}", "Content-Type": "application/x-www-form-urlencoded"},
            content="grant_type=client_credentials",
        )
        r.raise_for_status()
        return r.json()["access_token"]


async def create_order(amount_usd: float) -> dict:
    """Returns {order_id, approval_url}."""
    if MOCK:
        oid = "MOCK-ORDER-" + uuid.uuid4().hex[:8].upper()
        return {"order_id": oid, "approval_url": f"https://www.sandbox.paypal.com/checkoutnow?token={oid}"}
    token = await _token()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{BASE}/v2/checkout/orders",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={
                "intent": "CAPTURE",
                "purchase_units": [{"amount": {"currency_code": "USD", "value": f"{amount_usd:.2f}"}}],
            },
        )
        r.raise_for_status()
        data = r.json()
    approval = next((l["href"] for l in data.get("links", []) if l.get("rel") == "approve"), "")
    return {"order_id": data["id"], "approval_url": approval}


async def capture_order(order_id: str) -> dict:
    """Returns {capture_id}. Mock returns MOCK-CAPTURE id."""
    if MOCK or order_id.startswith("MOCK-"):
        return {"capture_id": "MOCK-CAPTURE-" + uuid.uuid4().hex[:8].upper()}
    token = await _token()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{BASE}/v2/checkout/orders/{order_id}/capture",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={},
        )
        r.raise_for_status()
        data = r.json()
    try:
        cap = data["purchase_units"][0]["payments"]["captures"][0]["id"]
    except (KeyError, IndexError):
        cap = "UNKNOWN"
    return {"capture_id": cap}


async def refund_capture(capture_id: str, amount_usd: float) -> dict:
    """Returns {refund_id}. Mock returns MOCK-REFUND id."""
    if MOCK or capture_id.startswith("MOCK-"):
        return {"refund_id": "MOCK-REFUND-" + uuid.uuid4().hex[:8].upper()}
    token = await _token()
    async with httpx.AsyncClient(timeout=20) as c:
        r = await c.post(
            f"{BASE}/v2/payments/captures/{capture_id}/refund",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json={"amount": {"currency_code": "USD", "value": f"{amount_usd:.2f}"}},
        )
        r.raise_for_status()
        return {"refund_id": r.json().get("id", "UNKNOWN")}
