"""Vertical-slice tests: chat -> hold -> prove-first -> release/refund. Run: pytest -q"""
import io
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
os.environ["EZRI_DB"] = os.path.join(os.path.dirname(__file__), "test_ezri.db")
if os.path.exists(os.environ["EZRI_DB"]):
    os.remove(os.environ["EZRI_DB"])

from fastapi.testclient import TestClient
from server import app

c = TestClient(app)


def test_health():
    r = c.get("/api/health")
    assert r.status_code == 200 and r.json()["ok"] is True


def test_parse_school():
    r = c.post("/api/chat/parse", json={"text": "Send $60 to mom for school fees"})
    assert r.status_code == 200
    body = r.json()
    assert body["tag"] == "SCHOOL" and body["amount_usd"] == 60.0


def test_full_hold_prove_release_refund():
    cr = c.post("/api/escrow/create", json={"amount_usd": 60, "tag": "SCHOOL", "note": "for mom", "recipient": "mom"})
    eid = cr.json()["escrow_id"]
    cap = c.post("/api/escrow/capture", json={"escrow_id": eid})
    assert cap.json()["status"] == "HELD"
    # FAIL first: wrong paperwork
    bad = c.post("/api/escrow/prove",
                 data={"escrow_id": eid, "provider": "MTN", "provider_number": "0881234567", "note": "random"},
                 files={"proof": ("x.bin", io.BytesIO(b"0" * 9000), "image/jpeg")})
    assert bad.json()["verdict"] == "FAIL"
    # PASS: school bill
    good = c.post("/api/escrow/prove",
                  data={"escrow_id": eid, "provider": "MTN", "provider_number": "0881234567", "note": "school tuition invoice"},
                  files={"proof": ("school_invoice.jpg", io.BytesIO(b"1" * 20000), "image/jpeg")})
    assert good.json()["status"] == "RELEASED"
    assert good.json()["mock_momo_txn_id"].startswith("MOCK-MOMO-")
    # second escrow -> refund path
    cr2 = c.post("/api/escrow/create", json={"amount_usd": 20, "tag": "FOOD", "note": "rice", "recipient": "mom"})
    eid2 = cr2.json()["escrow_id"]
    c.post("/api/escrow/capture", json={"escrow_id": eid2})
    rf = c.post("/api/escrow/refund", json={"escrow_id": eid2})
    assert rf.json()["status"] == "REFUNDED"
