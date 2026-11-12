"""Dual Postgres (Neon + Prisma) / SQLite ledger — HELD -> RELEASED / REFUNDED.

DATABASE_URL is the primary Postgres target (Neon).
DATABASE_URL_SECONDARY is the optional second target (Prisma Postgres).
Reads prefer healthy targets and fail over automatically; writes are mirrored
to both while healthy. Redis (Upstash) sits in front of SQL reads. With no
DATABASE_URL the app uses SQLite, so tests and zero-key demos still work.
"""
from __future__ import annotations
import json
import os
import sqlite3
import threading
import time
import uuid
import hashlib
import secrets
from dataclasses import dataclass, field
from typing import Any

from env_loader import load_env

load_env()  # direct imports (tests/scripts) must see the same .env as server.py

from ai_guard import FEE_PCT  # single source of truth: 2% platform fee
import cache

DATABASE_URL = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL", "").strip()
DATABASE_URL_UNPOOLED = os.environ.get("DATABASE_URL_UNPOOLED", "").strip()
DATABASE_URL_SECONDARY = os.environ.get("DATABASE_URL_SECONDARY", "").strip()
DATABASE_URL_SECONDARY_UNPOOLED = os.environ.get("DATABASE_URL_SECONDARY_UNPOOLED", "").strip()
DB = os.environ.get("EZRI_DB", os.path.join(os.path.dirname(__file__), "ezri.db"))


def _env_int(name: str, default: int, minimum: int = 1) -> int:
    try:
        return max(minimum, int(os.environ.get(name, str(default))))
    except (TypeError, ValueError):
        return default


DB_MIRROR_WRITES = os.environ.get("DB_MIRROR_WRITES", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)
DB_CONNECT_TIMEOUT = _env_int("DB_CONNECT_TIMEOUT", 5, 1)
DB_STATEMENT_TIMEOUT_MS = _env_int("DB_STATEMENT_TIMEOUT_MS", 3000, 500)
DB_INIT_TIMEOUT = _env_int("DB_INIT_TIMEOUT", 15, 5)
DB_INIT_TIMEOUT_MS = _env_int("DB_INIT_TIMEOUT_MS", 15000, 5000)
DB_FAILURE_COOLDOWN = _env_int("DB_FAILURE_COOLDOWN_SECONDS", 30, 1)
DB_SLOW_MS = _env_int("DB_SLOW_MS", 3000, 100)
DB_POOL_MIN = _env_int("DB_POOL_MIN", 1, 1)
DB_POOL_MAX = max(DB_POOL_MIN, _env_int("DB_POOL_MAX", 5, 1))

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

@dataclass
class DBTarget:
    """One independent Postgres door (primary or secondary)."""

    name: str
    url: str
    init_url: str
    initialized: bool = False
    last_ok: float = 0.0
    last_failure: float = 0.0
    last_latency_ms: float = 0.0
    last_error: str = ""
    failures: int = 0
    cooldown_until: float = 0.0
    cooldown_reason: str = ""
    init_lock: threading.Lock = field(default_factory=threading.Lock, repr=False)
    pool: Any = None
    pool_lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def status(self) -> str:
        if self.cooldown_until > time.time():
            return "slow" if self.cooldown_reason == "slow" else "down"
        if self.last_failure > self.last_ok:
            return "down"
        if self.last_ok:
            return "up"
        return "unknown"


def _configured_targets() -> list[DBTarget]:
    targets: list[DBTarget] = []
    if DATABASE_URL:
        targets.append(
            DBTarget("primary", DATABASE_URL, DATABASE_URL_UNPOOLED or DATABASE_URL)
        )
    if DATABASE_URL_SECONDARY and DATABASE_URL_SECONDARY != DATABASE_URL:
        targets.append(
            DBTarget(
                "secondary",
                DATABASE_URL_SECONDARY,
                DATABASE_URL_SECONDARY_UNPOOLED or DATABASE_URL_SECONDARY,
            )
        )
    return targets


_TARGETS = _configured_targets()
_TARGET_LOCK = threading.Lock()


def _connect(url: str, timeout: int):
    import psycopg2
    import psycopg2.extras

    # Do not pass libpq `options` here: Prisma's pooler rejects startup
    # parameters. The statement timeout is set inside each transaction below,
    # which works on both Neon and Prisma poolers.
    return psycopg2.connect(
        url,
        connect_timeout=max(1, timeout),
        application_name="ezri-api",
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def _pooled_conn(target: DBTarget):
    """Reuse a small number of connections per target instead of one per query."""
    import psycopg2.extras
    import psycopg2.pool

    with target.pool_lock:
        if target.pool is None:
            target.pool = psycopg2.pool.ThreadedConnectionPool(
                DB_POOL_MIN,
                DB_POOL_MAX,
                target.url,
                connect_timeout=DB_CONNECT_TIMEOUT,
                application_name="ezri-api",
                cursor_factory=psycopg2.extras.RealDictCursor,
            )
    conn = target.pool.getconn()
    if conn.closed:
        target.pool.putconn(conn, close=True)
        conn = target.pool.getconn()
    return conn


def _return_conn(target: DBTarget, conn, close: bool = False) -> None:
    if target.pool is None:
        try:
            conn.close()
        except Exception:
            pass
        return
    try:
        target.pool.putconn(conn, close=close)
    except Exception:
        try:
            conn.close()
        except Exception:
            pass


def _init_target(target: DBTarget) -> None:
    if target.initialized:
        return
    with target.init_lock:
        if target.initialized:
            return
        # Neon: use the direct endpoint for schema work when available.
        # Prisma only exposes a pooled endpoint; DDL works through its pooler.
        conn = _connect(target.init_url, DB_INIT_TIMEOUT)
        try:
            with conn.cursor() as cur:
                cur.execute(f"SET LOCAL statement_timeout = {DB_INIT_TIMEOUT_MS}")
                cur.execute(POSTGRES_SCHEMA)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
        target.initialized = True
        # Warm one pooled connection so the first user request does not pay
        # for TCP/TLS setup.
        conn = _pooled_conn(target)
        _return_conn(target, conn)


def _run_on_target(target: DBTarget, query_pg: str, params: tuple) -> list[dict]:
    _init_target(target)
    conn = _pooled_conn(target)
    close_on_return = False
    try:
        with conn.cursor() as cur:
            cur.execute(f"SET LOCAL statement_timeout = {DB_STATEMENT_TIMEOUT_MS}")
            cur.execute(query_pg, params)
            rows = [dict(r) for r in cur.fetchall()] if cur.description else []
        conn.commit()
        return rows
    except Exception as exc:
        try:
            conn.rollback()
        except Exception:
            close_on_return = True
        try:
            import psycopg2

            if isinstance(exc, (psycopg2.OperationalError, psycopg2.InterfaceError)):
                close_on_return = True
        except Exception:
            close_on_return = True
        raise
    finally:
        _return_conn(target, conn, close=close_on_return)


def _is_health_error(exc: Exception) -> bool:
    """Integrity errors mean the DB is up and rejected one statement."""
    try:
        import psycopg2

        return not isinstance(exc, psycopg2.IntegrityError)
    except Exception:
        return True


def _record_success(target: DBTarget, latency_ms: float, allow_slow: bool = True) -> None:
    slow = allow_slow and latency_ms > DB_SLOW_MS
    with _TARGET_LOCK:
        target.last_ok = time.time()
        target.last_failure = 0.0
        target.last_latency_ms = round(latency_ms, 1)
        target.last_error = ""
        target.failures = 0
        if slow:
            target.cooldown_until = time.time() + DB_FAILURE_COOLDOWN
            target.cooldown_reason = "slow"
        else:
            target.cooldown_until = 0.0
            target.cooldown_reason = ""
    if slow:
        print(
            f"[DB] {target.name} slow ({latency_ms:.0f}ms); "
            f"reads prefer the other target for {DB_FAILURE_COOLDOWN}s"
        )


def _record_failure(target: DBTarget, exc: Exception) -> None:
    with _TARGET_LOCK:
        target.failures += 1
        target.last_failure = time.time()
        target.last_error = f"{type(exc).__name__}: {str(exc)[:160]}"
        target.cooldown_until = time.time() + DB_FAILURE_COOLDOWN
        target.cooldown_reason = "error"
    print(
        f"[DB] {target.name} unavailable: {type(exc).__name__}: "
        f"{str(exc)[:160]} (cooldown {DB_FAILURE_COOLDOWN}s)"
    )


def _note_target_error(target: DBTarget, exc: Exception) -> None:
    if _is_health_error(exc):
        _record_failure(target, exc)
        return
    with _TARGET_LOCK:
        target.last_error = f"{type(exc).__name__}: {str(exc)[:160]}"
    print(
        f"[DB] {target.name} rejected the statement: {type(exc).__name__}: "
        f"{str(exc)[:160]}"
    )


def _ordered_targets(for_write: bool = False) -> list[DBTarget]:
    now = time.time()
    with _TARGET_LOCK:
        ready = [
            t
            for t in _TARGETS
            if t.cooldown_until <= now
            or (for_write and t.cooldown_reason == "slow")
        ]
    # If both doors are cooling down, try them anyway so the app can recover.
    return ready or list(_TARGETS)


def _cacheable(sql: str) -> bool:
    """Never put auth secrets or OTP/reset material in Redis."""
    if not cache.CACHE_ENABLED:
        return False
    lowered = sql.lower()
    return not any(table in lowered for table in ("users", "sessions", "otps", "resets"))


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


def _execute_sqlite(query_sqlite: str, params: tuple = ()) -> list[dict]:
    with _get_sqlite_conn() as con:
        cur = con.execute(query_sqlite, params)
        if query_sqlite.strip().upper().startswith("SELECT"):
            return [dict(r) for r in cur.fetchall()]
        con.commit()
        return []


def _read(query_sqlite: str, params: tuple) -> list[dict]:
    key = cache.sql_key(query_sqlite, params) if _cacheable(query_sqlite) else ""
    if key:
        cached = cache.get_json(key)
        if cached is not None:
            return cached

    query_pg = query_sqlite.replace("?", "%s")
    saw_empty = False
    for target in _ordered_targets(for_write=False):
        started = time.perf_counter()
        try:
            rows = _run_on_target(target, query_pg, params)
            latency_ms = (time.perf_counter() - started) * 1000
            _record_success(target, latency_ms)
            if rows:
                if key:
                    cache.set_json(key, rows, cache.READ_TTL)
                return rows
            # An empty result may mean this target missed a write while it was
            # down. Ask the other door before accepting emptiness.
            saw_empty = True
        except Exception as exc:  # noqa: BLE001 - failover is the point
            _note_target_error(target, exc)

    if saw_empty:
        if key:
            cache.set_json(key, [], min(cache.READ_TTL, 10))
        return []

    print("[DB] all Postgres targets failed the read; using SQLite fallback")
    return _execute_sqlite(query_sqlite, params)


def _write(query_sqlite: str, params: tuple) -> list[dict]:
    query_pg = query_sqlite.replace("?", "%s")
    targets = _ordered_targets(for_write=True)
    successes = 0

    for target in targets:
        started = time.perf_counter()
        try:
            _run_on_target(target, query_pg, params)
            latency_ms = (time.perf_counter() - started) * 1000
            _record_success(target, latency_ms)
            successes += 1
            if not DB_MIRROR_WRITES:
                break
        except Exception as exc:  # noqa: BLE001 - failover is the point
            _note_target_error(target, exc)

    if successes:
        cache.bump_version()
        if len(targets) > 1 and successes < len(targets):
            print(f"[DB] write applied to {successes}/{len(targets)} targets")
        return []

    print("[DB] all Postgres targets failed the write; using SQLite fallback")
    rows = _execute_sqlite(query_sqlite, params)
    cache.bump_version()
    return rows


def _execute(query_sqlite: str, params: tuple = ()) -> list[dict]:
    if not _TARGETS:
        return _execute_sqlite(query_sqlite, params)
    if query_sqlite.strip().upper().startswith("SELECT"):
        return _read(query_sqlite, params)
    return _write(query_sqlite, params)


def warmup() -> dict:
    """Connect/init both targets once. Safe to run in a background thread."""
    result = {}
    for target in _TARGETS:
        started = time.perf_counter()
        try:
            _init_target(target)
            latency_ms = (time.perf_counter() - started) * 1000
            _record_success(target, latency_ms, allow_slow=False)
            result[target.name] = "up"
            print(f"[DB] {target.name} ready ({latency_ms:.0f}ms)")
        except Exception as exc:  # noqa: BLE001 - the other door may still work
            _note_target_error(target, exc)
            result[target.name] = "down"
    return result


def db_status() -> dict:
    with _TARGET_LOCK:
        targets = [
            {
                "name": t.name,
                "status": t.status(),
                "latency_ms": round(t.last_latency_ms, 1),
                "last_error": t.last_error,
            }
            for t in _TARGETS
        ]
    mode = "dual" if len(targets) >= 2 else ("single" if targets else "sqlite")
    return {"mode": mode, "targets": targets}


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


def _user_cache_key(email: str) -> str:
    digest = hashlib.sha256(email.encode("utf-8")).hexdigest()[:32]
    return f"{cache.KEY_PREFIX}:user:{digest}"


def _session_cache_key(token: str) -> str:
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()[:32]
    return f"{cache.KEY_PREFIX}:sess:{digest}"


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
    cache.delete(_user_cache_key(email))
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
    key = _user_cache_key(email)
    if cache.CACHE_ENABLED:
        cached = cache.get_json(key)
        if cached is not None:
            return cached or None
    rows = _execute("SELECT * FROM users WHERE email=?", (email,))
    out = _user_out(rows[0]) if rows else None
    if cache.CACHE_ENABLED:
        cache.set_json(key, out or {}, cache.USER_TTL)
    return out


def update_user_profile(email: str, **fields) -> dict | None:
    """Update whitelisted profile fields. None/absent values are ignored."""
    email = email.strip().lower()
    allowed = {k: v for k, v in fields.items() if k in PROFILE_FIELDS and v is not None}
    if allowed:
        cols = ", ".join(f"{k}=?" for k in allowed)
        _execute(f"UPDATE users SET {cols} WHERE email=?", tuple(allowed.values()) + (email,))
        cache.delete(_user_cache_key(email))
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
    if cache.CACHE_ENABLED:
        cache.set_json(_session_cache_key(token), email, cache.SESSION_TTL)
    return token


def get_session_email(token: str) -> str:
    token = (token or "").strip()
    if not token:
        return ""
    key = _session_cache_key(token)
    if cache.CACHE_ENABLED:
        cached = cache.get_json(key)
        if cached is not None:
            return cached if isinstance(cached, str) else ""
    rows = _execute("SELECT email FROM sessions WHERE token=?", (token,))
    email = rows[0]["email"] if rows else ""
    if cache.CACHE_ENABLED:
        cache.set_json(key, email, cache.SESSION_TTL if email else 30)
    return email


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
