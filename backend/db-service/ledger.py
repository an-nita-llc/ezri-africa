"""Prisma Postgres / PostgreSQL / SQLite Dual Ledger Microservice.
Connects to Prisma Postgres via DATABASE_URL when set, falls back to SQLite locally.
"""
from __future__ import annotations
import os
import sqlite3
import time
import uuid
import hashlib
import secrets

FEE_PCT = 0.02  # 2% Ezri platform fee

DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL", "").strip()
DB = os.environ.get("EZRI_DB", os.path.join(os.path.dirname(__file__), "ezri.db"))

POSTGRES_SCHEMA = """
CREATE TABLE IF NOT EXISTS escrows(
  id VARCHAR(80) PRIMARY KEY,
  amount_usd DOUBLE PRECISION NOT NULL,
  fee_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  tag VARCHAR(80) NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  recipient VARCHAR(100) NOT NULL DEFAULT 'mom',
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  paypal_order_id VARCHAR(120) NOT NULL DEFAULT '',
  paypal_capture_id VARCHAR(120) NOT NULL DEFAULT '',
  provider VARCHAR(100) NOT NULL DEFAULT '',
  provider_number VARCHAR(100) NOT NULL DEFAULT '',
  verdict VARCHAR(40) NOT NULL DEFAULT '',
  verdict_reason TEXT NOT NULL DEFAULT '',
  mock_momo_txn_id VARCHAR(120) NOT NULL DEFAULT '',
  sender_email VARCHAR(120) NOT NULL DEFAULT '',
  created_at DOUBLE PRECISION NOT NULL,
  expires_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS users(
  email VARCHAR(120) PRIMARY KEY,
  name VARCHAR(120) NOT NULL DEFAULT '',
  pw_hash TEXT NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
  token VARCHAR(120) PRIMARY KEY,
  email VARCHAR(120) NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS virtual_cards(
  id VARCHAR(80) PRIMARY KEY,
  user_email VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  number VARCHAR(120) NOT NULL,
  expiry VARCHAR(20) NOT NULL,
  cvv VARCHAR(10) NOT NULL,
  balance DOUBLE PRECISION NOT NULL DEFAULT 100.0,
  frozen BOOLEAN NOT NULL DEFAULT FALSE,
  type VARCHAR(40) NOT NULL DEFAULT 'Visa',
  created_at DOUBLE PRECISION NOT NULL
);
"""

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS escrows(
  id TEXT PRIMARY KEY,
  amount_usd REAL NOT NULL,
  fee_usd REAL NOT NULL DEFAULT 0,
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
CREATE TABLE IF NOT EXISTS virtual_cards(
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  expiry TEXT NOT NULL,
  cvv TEXT NOT NULL,
  balance REAL NOT NULL DEFAULT 100.0,
  frozen INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Visa',
  created_at REAL NOT NULL
);
"""

_pg_initialized = False


def _get_pg_conn():
    import psycopg2
    import psycopg2.extras

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    conn.autocommit = True
    global _pg_initialized
    if not _pg_initialized:
        with conn.cursor() as cur:
            cur.execute(POSTGRES_SCHEMA)
        _pg_initialized = True
    return conn


def _get_sqlite_conn() -> sqlite3.Connection:
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.executescript(SQLITE_SCHEMA)
    return con


def _execute(query_sqlite: str, params: tuple = ()) -> list[dict]:
    if DATABASE_URL:
        try:
            query_pg = query_sqlite.replace("?", "%s")
            conn = _get_pg_conn()
            with conn.cursor() as cur:
                cur.execute(query_pg, params)
                if cur.description:
                    rows = cur.fetchall()
                    return [dict(r) for r in rows]
            conn.close()
            return []
        except Exception as e:
            print(f"[PostgreSQL DB Service Error] {e} — falling back to SQLite")

    with _get_sqlite_conn() as con:
        cur = con.execute(query_sqlite, params)
        if query_sqlite.strip().upper().startswith("SELECT"):
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        con.commit()
        return []


def create_escrow(amount_usd: float, tag: str, note: str, recipient: str, expiry_minutes: int, sender_email: str = "") -> dict:
    now = time.time()
    eid = "EZR-" + uuid.uuid4().hex[:8].upper()
    fee_usd = round(amount_usd * FEE_PCT, 2)
    _execute(
        "INSERT INTO escrows(id,amount_usd,fee_usd,tag,note,recipient,status,sender_email,created_at,expires_at) VALUES(?,?,?,?,?,?,'DRAFT',?,?,?)",
        (eid, amount_usd, fee_usd, tag, note, recipient, sender_email, now, now + expiry_minutes * 60),
    )
    return get_escrow(eid)


def get_escrow(eid: str) -> dict:
    rows = _execute("SELECT * FROM escrows WHERE id=?", (eid,))
    return rows[0] if rows else {}


def update_escrow(eid: str, **fields) -> dict:
    if not fields:
        return get_escrow(eid)
    cols = ", ".join(f"{k}=?" for k in fields)
    vals = list(fields.values()) + [eid]
    _execute(f"UPDATE escrows SET {cols} WHERE id=?", tuple(vals))
    return get_escrow(eid)


def list_escrows(limit: int = 100) -> list[dict]:
    return _execute("SELECT * FROM escrows ORDER BY created_at DESC LIMIT ?", (limit,))


def find_by_capture(capture_id: str) -> dict:
    rows = _execute("SELECT * FROM escrows WHERE paypal_capture_id=?", (capture_id,))
    return rows[0] if rows else {}


# ---- User Auth & Virtual Cards ----

def _hash(password: str, salt_hex: str = "") -> str:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${dk.hex()}"


def create_user(name: str, email: str, password: str) -> dict | None:
    email = email.strip().lower()
    if not email or len(password) < 4:
        return None
    existing = _execute("SELECT email FROM users WHERE email=?", (email,))
    if existing:
        return None
    _execute(
        "INSERT INTO users(email,name,pw_hash,created_at) VALUES(?,?,?,?)",
        (email, name.strip()[:80], _hash(password), time.time()),
    )
    return {"email": email, "name": name.strip()[:80]}


def verify_user(email: str, password: str) -> dict | None:
    email = email.strip().lower()
    rows = _execute("SELECT * FROM users WHERE email=?", (email,))
    if not rows:
        return None
    row = rows[0]
    try:
        salt_hex, _ = row["pw_hash"].split("$", 1)
    except ValueError:
        return None
    if _hash(password, salt_hex) != row["pw_hash"]:
        return None
    return {"email": row["email"], "name": row["name"]}


def get_user(email: str) -> dict | None:
    email = email.strip().lower()
    rows = _execute("SELECT email,name FROM users WHERE email=?", (email,))
    return {"email": rows[0]["email"], "name": rows[0]["name"]} if rows else None


def create_session(email: str) -> str:
    token = "ezk_" + secrets.token_hex(24)
    _execute("INSERT INTO sessions(token,email,created_at) VALUES(?,?,?)", (token, email, time.time()))
    return token


def get_session_email(token: str) -> str:
    rows = _execute("SELECT email FROM sessions WHERE token=?", (token,))
    return rows[0]["email"] if rows else ""
