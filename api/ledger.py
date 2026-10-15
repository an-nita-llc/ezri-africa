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
  sender_email TEXT NOT NULL DEFAULT '',
  created_at REAL NOT NULL,
  expires_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS users(
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  pw_hash TEXT NOT NULL,
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at REAL NOT NULL
);
"""


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    for ddl in (
        "ALTER TABLE escrows ADD COLUMN sender_email TEXT NOT NULL DEFAULT ''",
    ):
        try:
            con.execute(ddl)
        except sqlite3.OperationalError:
            pass
    return con


def create_escrow(amount_usd: float, tag: str, note: str, recipient: str, expiry_minutes: int, sender_email: str = "") -> dict:
    now = time.time()
    eid = "EZR-" + uuid.uuid4().hex[:8].upper()
    with _db() as con:
        con.execute(
            "INSERT INTO escrows(id,amount_usd,tag,note,recipient,status,sender_email,created_at,expires_at) VALUES(?,?,?,?,?,'DRAFT',?,?,?)",
            (eid, amount_usd, tag, note, recipient, sender_email, now, now + expiry_minutes * 60),
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


# ---- sender auth (demo-grade: pbkdf2 + opaque tokens, no new deps) ----
import hashlib
import secrets

def _hash(password: str, salt_hex: str = "") -> str:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${dk.hex()}"


def create_user(name: str, email: str, password: str) -> dict | None:
    email = email.strip().lower()
    if not email or len(password) < 4:
        return None
    with _db() as con:
        if con.execute("SELECT 1 FROM users WHERE email=?", (email,)).fetchone():
            return None
        con.execute(
            "INSERT INTO users(email,name,pw_hash,created_at) VALUES(?,?,?,?)",
            (email, name.strip()[:80], _hash(password), time.time()),
        )
    return {"email": email, "name": name.strip()[:80]}


def verify_user(email: str, password: str) -> dict | None:
    email = email.strip().lower()
    with _db() as con:
        row = con.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not row:
        return None
    try:
        salt_hex, _ = row["pw_hash"].split("$", 1)
    except ValueError:
        return None
    if _hash(password, salt_hex) != row["pw_hash"]:
        return None
    return {"email": row["email"], "name": row["name"]}


def create_session(email: str) -> str:
    token = "ezk_" + secrets.token_hex(24)
    with _db() as con:
        con.execute("INSERT INTO sessions(token,email,created_at) VALUES(?,?,?)", (token, email, time.time()))
    return token


def get_session_email(token: str) -> str:
    with _db() as con:
        row = con.execute("SELECT email FROM sessions WHERE token=?", (token,)).fetchone()
    return row["email"] if row else ""
