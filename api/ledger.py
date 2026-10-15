"""SQLite ledger — HELD -> RELEASED / REFUNDED. Stdlib only, same escrow idea as AnnitaPlug."""
from __future__ import annotations
import os
import sqlite3
import time
import uuid

DB = os.environ.get("EZRI_DB", os.path.join(os.path.dirname(__file__), "ezri.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS escrows(
  id TEXT PRIMARY KEY,
  amount_usd REAL NOT NULL,
  tag TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  recipient TEXT NOT NULL DEFAULT 'mom',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  paypal_order_id TEXT NOT NULL DEFAULT '',
  paypal_capture_id TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT '',
  provider_number TEXT NOT NULL DEFAULT '',
  verdict TEXT NOT NULL DEFAULT '',
  verdict_reason TEXT NOT NULL DEFAULT '',
  mock_momo_txn_id TEXT NOT NULL DEFAULT '',
  created_at REAL NOT NULL,
  expires_at REAL NOT NULL
);
"""


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def create_escrow(amount_usd: float, tag: str, note: str, recipient: str, expiry_minutes: int) -> dict:
    now = time.time()
    eid = "EZR-" + uuid.uuid4().hex[:8].upper()
    with _db() as con:
        con.execute(
            "INSERT INTO escrows(id,amount_usd,tag,note,recipient,status,created_at,expires_at) VALUES(?,?,?,?,?,'DRAFT',?,?)",
            (eid, amount_usd, tag, note, recipient, now, now + expiry_minutes * 60),
        )
    return get_escrow(eid)


def get_escrow(eid: str) -> dict:
    with _db() as con:
        row = con.execute("SELECT * FROM escrows WHERE id=?", (eid,)).fetchone()
    return dict(row) if row else {}


def update_escrow(eid: str, **fields) -> dict:
    if not fields:
        return get_escrow(eid)
    cols = ", ".join(f"{k}=?" for k in fields)
    vals = list(fields.values()) + [eid]
    with _db() as con:
        con.execute(f"UPDATE escrows SET {cols} WHERE id=?", vals)
    return get_escrow(eid)


def list_escrows(limit: int = 100) -> list[dict]:
    with _db() as con:
        rows = con.execute("SELECT * FROM escrows ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


def find_by_capture(capture_id: str) -> dict:
    with _db() as con:
        row = con.execute("SELECT * FROM escrows WHERE paypal_capture_id=?", (capture_id,)).fetchone()
    return dict(row) if row else {}
