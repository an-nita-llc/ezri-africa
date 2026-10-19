"""Extended-feature tests: signup profile persistence, virtual card vault,
purpose-lock prefs, OTP sign-in, forgot/reset password, and the event log.

Runs against the same isolated test DB as the other suites (per-user
assertions only — never global row counts). Run: pytest -q
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
os.environ["EZRI_DB"] = os.path.join(os.path.dirname(__file__), "test_ezri.db")
if os.path.exists(os.environ["EZRI_DB"]):
    os.remove(os.environ["EZRI_DB"])

from fastapi.testclient import TestClient
from server import app

c = TestClient(app)


def _signup(email: str, password: str = "secret1") -> str:
    r = c.post(
        "/api/auth/signup",
        json={"name": "Test Sender", "email": email, "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def test_signup_profile_fields_persist_and_update():
    r = c.post(
        "/api/auth/signup",
        json={
            "name": "Ada", "email": "ada.profile@x.com", "password": "secret1",
            "phone": "+231 088 123 4567", "country": "Liberia",
            "provider": "MTN Mobile Money", "region_type": "AFRICA",
            "dob": "1994-02-01", "location": "Monrovia",
        },
    )
    assert r.status_code == 200
    token = r.json()["token"]
    h = {"Authorization": f"Bearer {token}"}
    me = c.get("/api/auth/me", headers=h).json()
    assert me["phone"] == "+231 088 123 4567" and me["country"] == "Liberia"
    assert me["region_type"] == "AFRICA" and me["dob"] == "1994-02-01"
    assert me["location"] == "Monrovia" and me["provider"] == "MTN Mobile Money"
    # Profile endpoint updates only the provided fields.
    up = c.post("/api/profile", json={"phone": "+231 077 000 0000", "name": "Ada K"}, headers=h)
    assert up.status_code == 200
    assert up.json()["phone"] == "+231 077 000 0000" and up.json()["name"] == "Ada K"
    assert up.json()["country"] == "Liberia"  # untouched field survives
    assert c.get("/api/profile").status_code == 401


def test_cards_crud_auth_and_limits():
    assert c.get("/api/cards").status_code == 401
    token = _signup("cards@x.com")
    h = {"Authorization": f"Bearer {token}"}
    assert c.get("/api/cards", headers=h).json()["cards"] == []

    first = c.post("/api/cards/create", json={"name": "School Fees Card", "brand": "Visa"}, headers=h)
    assert first.status_code == 200
    card = first.json()["card"]
    assert card["type"] == "Visa" and card["number"].startswith("4242")
    assert card["balance"] == 100.0 and card["frozen"] is False and len(card["cvv"]) == 3

    c.post("/api/cards/create", json={"name": "Health", "brand": "Mastercard"}, headers=h)
    c.post("/api/cards/create", json={"name": "Rent", "brand": "Visa"}, headers=h)
    fourth = c.post("/api/cards/create", json={"name": "Fourth", "brand": "Visa"}, headers=h)
    assert fourth.status_code == 400

    fr = c.post("/api/cards/freeze", json={"card_id": card["id"], "frozen": True}, headers=h)
    assert fr.json()["card"]["frozen"] is True
    up = c.post("/api/cards/freeze", json={"card_id": card["id"], "frozen": False}, headers=h)
    assert up.json()["card"]["frozen"] is False
    tp = c.post("/api/cards/topup", json={"card_id": card["id"], "amount": 25.5}, headers=h)
    assert tp.json()["card"]["balance"] == 125.5

    assert len(c.get("/api/cards", headers=h).json()["cards"]) == 3
    dl = c.post("/api/cards/delete", json={"card_id": card["id"]}, headers=h)
    assert dl.json()["ok"] is True
    assert len(c.get("/api/cards", headers=h).json()["cards"]) == 2

    # Another sender can never touch these cards.
    other = {"Authorization": f"Bearer {_signup('other.cards@x.com')}"}
    assert c.post("/api/cards/delete", json={"card_id": card["id"]}, headers=other).status_code == 404
    assert c.get("/api/cards", headers=other).json()["cards"] == []


def test_prefs_roundtrip():
    token = _signup("prefs@x.com")
    h = {"Authorization": f"Bearer {token}"}
    assert c.get("/api/prefs", headers=h).json()["prefs"] is None
    payload = {
        "active_tag": "SCHOOL", "strict_proof": True, "require_photo": True,
        "auto_refund": True, "speech_enabled": False, "expiry_minutes": 2880,
        "requireApproval": True, "requirePin": True, "refundApproval": True,
        "profile": {"name": "Prefs Tester", "phone": "+1 555 0100", "avatar": None},
    }
    assert c.post("/api/prefs", json={"payload": payload}, headers=h).json()["ok"] is True
    got = c.get("/api/prefs", headers=h).json()["prefs"]
    assert got["active_tag"] == "SCHOOL" and got["expiry_minutes"] == 2880
    assert got["profile"]["phone"] == "+1 555 0100"
    assert c.get("/api/prefs").status_code == 401


def test_otp_request_and_single_use_verify():
    email = "otp.user@x.com"
    assert c.post("/api/auth/otp/request", json={"email": "not-an-email"}).status_code == 400
    r = c.post("/api/auth/otp/request", json={"email": email})
    assert r.status_code == 200
    code = r.json()["demo_code"]
    assert len(code) == 6 and code.isdigit()
    wrong = "000000" if code != "000000" else "111111"
    assert c.post("/api/auth/otp/verify", json={"email": email, "code": wrong}).status_code == 401
    ok = c.post("/api/auth/otp/verify", json={"email": email, "code": code})
    assert ok.status_code == 200
    token = ok.json()["token"]
    me = c.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email"] == email
    # Codes are single-use.
    assert c.post("/api/auth/otp/verify", json={"email": email, "code": code}).status_code == 401


def test_forgot_reset_password_flow():
    email = "reset.me@x.com"
    _signup(email, "secret1")
    assert c.post("/api/auth/login", json={"email": email, "password": "secret1"}).status_code == 200

    f = c.post("/api/auth/forgot", json={"email": email})
    assert f.status_code == 200
    token = f.json()["demo_token"]
    assert token and token.startswith("ezr-reset-") and "token=" in f.json()["reset_url"]

    # Unknown emails get a generic OK with no token (no account enumeration).
    ghost = c.post("/api/auth/forgot", json={"email": "ghost@x.com"})
    assert ghost.json()["demo_token"] is None

    assert c.post("/api/auth/reset", json={"token": "nope", "password": "newpass1"}).status_code == 401
    ok = c.post("/api/auth/reset", json={"token": token, "password": "newpass1"})
    assert ok.json()["ok"] is True
    assert c.post("/api/auth/login", json={"email": email, "password": "secret1"}).status_code == 401
    assert c.post("/api/auth/login", json={"email": email, "password": "newpass1"}).status_code == 200
    # Reset links are single-use.
    assert c.post("/api/auth/reset", json={"token": token, "password": "another1"}).status_code == 401


def test_event_log_records_lifecycle_and_redacts_secrets():
    c.post("/api/auth/otp/request", json={"email": "redact.check@x.com"})
    cr = c.post(
        "/api/escrow/create",
        json={"amount_usd": 15, "tag": "FOOD", "note": "rice", "recipient": "mom"},
    )
    eid = cr.json()["escrow_id"]
    ev = c.get("/api/events")
    assert ev.status_code == 200
    assert "notify_webhook" in ev.json()
    events = ev.json()["events"]
    assert any(
        e["event"] == "transfer.created" and e["payload"].get("escrow_id") == eid
        for e in events
    )
    # The public log never carries OTP codes or reset tokens (only webhooks do).
    otp_events = [e for e in events if e["event"] == "auth.otp_requested"]
    assert otp_events and all("code" not in e["payload"] for e in otp_events)
    reset_events = [e for e in events if e["event"] == "auth.reset_requested"]
    assert all("reset_url" not in e["payload"] for e in reset_events)
