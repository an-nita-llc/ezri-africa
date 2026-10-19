"""Prisma Postgres / PostgreSQL / SQLite Dual Ledger — HELD -> RELEASED / REFUNDED.
Connects to Prisma Postgres via DATABASE_URL when set, falls back to SQLite locally.
"""
from __future__ import annotations
import json
import os
import sqlite3
import time
import uuid
import hashlib
import secrets

from ai_guard import FEE_PCT  # single source of truth: 2% platform fee

DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL", "").strip()
DATABASE_URL_UNPOOLED = os.environ.get("DATABASE_URL_UNPOOLED", "").strip()
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
CREATE TABLE IF NOT EXISTS cards(
  id VARCHAR(80) PRIMARY KEY,
  email VARCHAR(120) NOT NULL,
  name VARCHAR(80) NOT NULL DEFAULT 'Virtual Remittance Card',
  brand VARCHAR(20) NOT NULL DEFAULT 'Visa',
  number VARCHAR(30) NOT NULL DEFAULT '',
  expiry VARCHAR(10) NOT NULL DEFAULT '',
  cvv VARCHAR(5) NOT NULL DEFAULT '',
  balance DOUBLE PRECISION NOT NULL DEFAULT 100,
  frozen INTEGER NOT NULL DEFAULT 0,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS prefs(
  email VARCHAR(120) PRIMARY KEY,
  payload TEXT NOT NULL DEFAULT '{}',
  updated_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS events(
  id BIGSERIAL PRIMARY KEY,
  event VARCHAR(80) NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS otps(
  email VARCHAR(120) PRIMARY KEY,
  code VARCHAR(10) NOT NULL,
  expires_at DOUBLE PRECISION NOT NULL,
  created_at DOUBLE PRECISION NOT NULL
);
CREATE TABLE IF NOT EXISTS resets(
  token VARCHAR(120) PRIMARY KEY,
  email VARCHAR(120) NOT NULL,
  expires_at DOUBLE PRECISION NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at DOUBLE PRECISION NOT NULL
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(20) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(80) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS region_type VARCHAR(20) NOT NULL DEFAULT '';
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
CREATE TABLE IF NOT EXISTS cards(
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Virtual Remittance Card',
  brand TEXT NOT NULL DEFAULT 'Visa',
  number TEXT NOT NULL DEFAULT '',
  expiry TEXT NOT NULL DEFAULT '',
  cvv TEXT NOT NULL DEFAULT '',
  balance REAL NOT NULL DEFAULT 100,
  frozen INTEGER NOT NULL DEFAULT 0,
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS prefs(
  email TEXT PRIMARY KEY,
  payload TEXT NOT NULL DEFAULT '{}',
  updated_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS otps(
  email TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at REAL NOT NULL,
  created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS resets(
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at REAL NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
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
        # Neon guidance: run schema work over the direct (unpooled) endpoint;
        # PgBouncer transaction pooling is for normal application traffic.
        init_conn = conn
        if DATABASE_URL_UNPOOLED and DATABASE_URL_UNPOOLED != DATABASE_URL:
            init_conn = psycopg2.connect(DATABASE_URL_UNPOOLED)
            init_conn.autocommit = True
        try:
            with init_conn.cursor() as cur:
                cur.execute(POSTGRES_SCHEMA)
        finally:
            if init_conn is not conn:
                init_conn.close()
        _pg_initialized = True
    return conn


def _get_sqlite_conn() -> sqlite3.Connection:
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    con.executescript(SQLITE_SCHEMA)
    for ddl in (
        "ALTER TABLE escrows ADD COLUMN sender_email TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE escrows ADD COLUMN fee_usd REAL NOT NULL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN dob TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN location TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN country TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN provider TEXT NOT NULL DEFAULT ''",
        "ALTER TABLE users ADD COLUMN region_type TEXT NOT NULL DEFAULT ''",
    ):
        try:
            con.execute(ddl)
        except sqlite3.OperationalError:
            pass
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
            print(f"[PostgreSQL Error] {e} — falling back to SQLite")

    # SQLite fallback
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
    rows = _execute("SELECT * FROM escrows ORDER BY created_at DESC LIMIT ?", (limit,))
    return rows


def find_by_capture(capture_id: str) -> dict:
    rows = _execute("SELECT * FROM escrows WHERE paypal_capture_id=?", (capture_id,))
    return rows[0] if rows else {}


# ---- Sender Auth (PBKDF2 + Opaque Tokens) ----

def _hash(password: str, salt_hex: str = "") -> str:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return f"{salt.hex()}${dk.hex()}"


PROFILE_FIELDS = ("name", "phone", "dob", "location", "country", "provider", "region_type")


def _user_out(row: dict) -> dict:
    return {k: row.get(k, "") or "" for k in ("email", *PROFILE_FIELDS)}


def create_user(name: str, email: str, password: str, profile: dict | None = None) -> dict | None:
    email = email.strip().lower()
    if not email or len(password) < 4:
        return None
    existing = _execute("SELECT email FROM users WHERE email=?", (email,))
    if existing:
        return None
    p = profile or {}
    _execute(
        "INSERT INTO users(email,name,pw_hash,created_at,phone,dob,location,country,provider,region_type) "
        "VALUES(?,?,?,?,?,?,?,?,?,?)",
        (
            email,
            name.strip()[:80],
            _hash(password),
            time.time(),
            str(p.get("phone", "") or "")[:40],
            str(p.get("dob", "") or "")[:20],
            str(p.get("location", "") or "")[:120],
            str(p.get("country", "") or "")[:80],
            str(p.get("provider", "") or "")[:120],
            str(p.get("region_type", "") or "")[:20],
        ),
    )
    return get_user(email)


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
    rows = _execute("SELECT * FROM users WHERE email=?", (email,))
    return _user_out(rows[0]) if rows else None


def update_user_profile(email: str, **fields) -> dict | None:
    """Update whitelisted profile fields. None/absent values are ignored."""
    email = email.strip().lower()
    allowed = {k: v for k, v in fields.items() if k in PROFILE_FIELDS and v is not None}
    if allowed:
        cols = ", ".join(f"{k}=?" for k in allowed)
        _execute(f"UPDATE users SET {cols} WHERE email=?", tuple(allowed.values()) + (email,))
    return get_user(email)


def set_password(email: str, password: str) -> bool:
    email = email.strip().lower()
    if len(password) < 4:
        return False
    rows = _execute("SELECT email FROM users WHERE email=?", (email,))
    if not rows:
        return False
    _execute("UPDATE users SET pw_hash=? WHERE email=?", (_hash(password), email))
    return True


def create_session(email: str) -> str:
    token = "ezk_" + secrets.token_hex(24)
    _execute("INSERT INTO sessions(token,email,created_at) VALUES(?,?,?)", (token, email, time.time()))
    return token


def get_session_email(token: str) -> str:
    rows = _execute("SELECT email FROM sessions WHERE token=?", (token,))
    return rows[0]["email"] if rows else ""


# ---- One-time sign-in codes (email OTP, demo-friendly) ----

def save_otp(email: str, code: str, ttl_minutes: int = 5) -> None:
    email = email.strip().lower()
    _execute("DELETE FROM otps WHERE email=?", (email,))
    _execute(
        "INSERT INTO otps(email,code,expires_at,created_at) VALUES(?,?,?,?)",
        (email, code, time.time() + ttl_minutes * 60, time.time()),
    )


def get_otp(email: str) -> dict:
    rows = _execute("SELECT * FROM otps WHERE email=?", (email.strip().lower(),))
    return rows[0] if rows else {}


def delete_otp(email: str) -> None:
    _execute("DELETE FROM otps WHERE email=?", (email.strip().lower(),))


# ---- Password reset links ----

def save_reset(token: str, email: str, ttl_minutes: int = 30) -> None:
    _execute(
        "INSERT INTO resets(token,email,expires_at,used,created_at) VALUES(?,?,?,0,?)",
        (token, email.strip().lower(), time.time() + ttl_minutes * 60, time.time()),
    )


def get_reset(token: str) -> dict:
    rows = _execute("SELECT * FROM resets WHERE token=?", (token.strip(),))
    return rows[0] if rows else {}


def use_reset(token: str) -> None:
    _execute("UPDATE resets SET used=1 WHERE token=?", (token.strip(),))


# ---- Virtual card vault (demo card numbers, persisted per sender) ----

def _luhn_digit(digits: str) -> str:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 0:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return str((10 - total % 10) % 10)


def _card_out(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "number": row["number"],
        "expiry": row["expiry"],
        "cvv": row["cvv"],
        "balance": round(float(row["balance"]), 2),
        "frozen": bool(row["frozen"]),
        "type": row["brand"],
        "created_at": row["created_at"],
    }


def create_card(email: str, name: str, brand: str) -> dict | None:
    email = email.strip().lower()
    if not email:
        return None
    if len(_execute("SELECT id FROM cards WHERE email=?", (email,))) >= 3:
        return None
    brand = "Mastercard" if "master" in (brand or "").lower() else "Visa"
    prefix = "5520" if brand == "Mastercard" else "4242"
    body = prefix + "".join(str(secrets.randbelow(10)) for _ in range(11))
    body += _luhn_digit(body)
    number = f"{body[:4]}  {body[4:8]}  {body[8:12]}  {body[12:16]}"
    exp = time.localtime(time.time() + 3 * 365 * 86400)
    expiry = f"{exp.tm_mon:02d}/{exp.tm_year % 100:02d}"
    cid = "CARD-" + secrets.token_hex(3).upper()
    _execute(
        "INSERT INTO cards(id,email,name,brand,number,expiry,cvv,balance,frozen,created_at) "
        "VALUES(?,?,?,?,?,?,?,?,0,?)",
        (
            cid,
            email,
            (name or "Virtual Remittance Card").strip()[:60] or "Virtual Remittance Card",
            brand,
            number,
            expiry,
            str(secrets.randbelow(900) + 100),
            100.0,
            time.time(),
        ),
    )
    return get_card(cid, email)


def get_card(card_id: str, email: str) -> dict:
    rows = _execute(
        "SELECT * FROM cards WHERE id=? AND email=?", (card_id, email.strip().lower())
    )
    return _card_out(rows[0]) if rows else {}


def list_cards(email: str) -> list[dict]:
    rows = _execute(
        "SELECT * FROM cards WHERE email=? ORDER BY created_at ASC", (email.strip().lower(),)
    )
    return [_card_out(r) for r in rows]


def update_card(card_id: str, email: str, **fields) -> dict:
    email = email.strip().lower()
    allowed = {k: v for k, v in fields.items() if k in ("frozen", "balance", "name")}
    if allowed:
        cols = ", ".join(f"{k}=?" for k in allowed)
        _execute(
            f"UPDATE cards SET {cols} WHERE id=? AND email=?",
            tuple(allowed.values()) + (card_id, email),
        )
    return get_card(card_id, email)


def delete_card(card_id: str, email: str) -> bool:
    email = email.strip().lower()
    if not _execute("SELECT id FROM cards WHERE id=? AND email=?", (card_id, email)):
        return False
    _execute("DELETE FROM cards WHERE id=? AND email=?", (card_id, email))
    return True


# ---- Purpose-lock preferences (per sender, JSON blob) ----

def save_prefs(email: str, payload: dict) -> None:
    email = email.strip().lower()
    _execute("DELETE FROM prefs WHERE email=?", (email,))
    _execute(
        "INSERT INTO prefs(email,payload,updated_at) VALUES(?,?,?)",
        (email, json.dumps(payload), time.time()),
    )


def get_prefs(email: str) -> dict | None:
    rows = _execute("SELECT payload FROM prefs WHERE email=?", (email.strip().lower(),))
    if not rows:
        return None
    try:
        return json.loads(rows[0]["payload"])
    except (TypeError, ValueError):
        return None


# ---- Event log (every emitted webhook event, demo-visible) ----

def add_event(event: str, payload: dict) -> None:
    _execute(
        "INSERT INTO events(event,payload,created_at) VALUES(?,?,?)",
        (event[:80], json.dumps(payload, default=str), time.time()),
    )


def list_events(limit: int = 25) -> list[dict]:
    rows = _execute("SELECT * FROM events ORDER BY created_at DESC LIMIT ?", (limit,))
    out = []
    for r in rows:
        try:
            payload = json.loads(r["payload"])
        except (TypeError, ValueError):
            payload = {}
        out.append(
            {"id": r["id"], "event": r["event"], "payload": payload, "created_at": r["created_at"]}
        )
    return out
