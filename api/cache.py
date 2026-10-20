"""Fail-open Redis cache for the Ezri ledger.

Backend selection:
  * ``UPSTASH_REDIS_REST_URL`` + ``UPSTASH_REDIS_REST_TOKEN`` -> Upstash REST
  * otherwise -> a small in-process TTL dictionary (local dev, tests, and a
    safe fallback if Upstash is unavailable)

Every operation is best-effort. A cache outage must never take the API down:
reads miss, writes still reach Postgres, and the request continues. The cache
is used for SQL read results, sender sessions, and public user profiles.
"""
from __future__ import annotations

import hashlib
import json
import os
import threading
import time
from typing import Any

import httpx

from env_loader import load_env

load_env()

REST_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip().rstrip("/")
REST_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()
CACHE_ENABLED = os.environ.get("DB_CACHE_ENABLED", "true").strip().lower() not in (
    "0",
    "false",
    "no",
    "off",
)

READ_TTL = max(1, int(os.environ.get("DB_READ_CACHE_TTL", "30")))
SESSION_TTL = max(30, int(os.environ.get("SESSION_CACHE_TTL", "600")))
USER_TTL = max(5, int(os.environ.get("USER_CACHE_TTL", "60")))

KEY_PREFIX = "ezri:v1"
VERSION_KEY = f"{KEY_PREFIX}:ver"
_MEM_MAX = 4096
_UPSTASH_RETRY_SECONDS = 30

# A persistent client keeps Upstash connections warm and is thread-safe.
_client = httpx.Client(
    timeout=httpx.Timeout(3.0, connect=1.5),
    limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
)

_stats_lock = threading.Lock()
_stats = {"hits": 0, "misses": 0, "errors": 0, "sets": 0}
_mem_lock = threading.Lock()
_mem: dict[str, tuple[float, str]] = {}

_circuit_lock = threading.Lock()
_consecutive_errors = 0
_circuit_open_until = 0.0

_version_lock = threading.Lock()
_version_local = ""
_version_at = 0.0


# ---------------------------------------------------------------------------
# Backend helpers
# ---------------------------------------------------------------------------

def backend() -> str:
    if not CACHE_ENABLED:
        return "off"
    if REST_URL and REST_TOKEN:
        return "upstash"
    return "memory"


def _upstash_ready() -> bool:
    if not (CACHE_ENABLED and REST_URL and REST_TOKEN):
        return False
    with _circuit_lock:
        return time.time() >= _circuit_open_until


def _upstash_ok() -> None:
    global _consecutive_errors, _circuit_open_until
    with _circuit_lock:
        _consecutive_errors = 0
        _circuit_open_until = 0.0


def _upstash_error(operation: str, exc: Exception) -> None:
    global _consecutive_errors, _circuit_open_until
    with _stats_lock:
        _stats["errors"] += 1
    with _circuit_lock:
        _consecutive_errors += 1
        if _consecutive_errors >= 3:
            _circuit_open_until = time.time() + _UPSTASH_RETRY_SECONDS
    print(f"[Cache] Upstash {operation} failed: {type(exc).__name__}: {str(exc)[:160]}")


def _command(parts: list[Any]) -> Any:
    """Run one Upstash REST command via POST (avoids URL length limits)."""
    res = _client.post(
        REST_URL,
        json=parts,
        headers={"Authorization": f"Bearer {REST_TOKEN}"},
    )
    res.raise_for_status()
    data = res.json()
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(str(data["error"])[:200])
    return data.get("result") if isinstance(data, dict) else data


def _mem_get(key: str) -> str | None:
    now = time.time()
    with _mem_lock:
        item = _mem.get(key)
        if not item:
            return None
        expires_at, value = item
        if expires_at <= now:
            _mem.pop(key, None)
            return None
        return value


def _mem_set(key: str, value: str, ttl: int) -> None:
    now = time.time()
    with _mem_lock:
        if len(_mem) >= _MEM_MAX:
            # Drop expired entries first, then the oldest quarter.
            for k in [k for k, (exp, _) in _mem.items() if exp <= now]:
                _mem.pop(k, None)
            if len(_mem) >= _MEM_MAX:
                for k in list(_mem)[: max(1, _MEM_MAX // 4)]:
                    _mem.pop(k, None)
        _mem[key] = (now + max(1, ttl), value)


def _hit() -> None:
    with _stats_lock:
        _stats["hits"] += 1


def _miss() -> None:
    with _stats_lock:
        _stats["misses"] += 1


# ---------------------------------------------------------------------------
# Generic key/value operations
# ---------------------------------------------------------------------------

def get(key: str) -> str | None:
    if not CACHE_ENABLED:
        return None

    if _upstash_ready():
        try:
            value = _command(["GET", key])
            _upstash_ok()
            if value is not None:
                _hit()
                return str(value)
        except Exception as exc:  # noqa: BLE001 - fail open
            _upstash_error("GET", exc)

    value = _mem_get(key)
    if value is not None:
        _hit()
        return value
    _miss()
    return None


def set(key: str, value: str, ttl: int = READ_TTL) -> bool:
    if not CACHE_ENABLED:
        return False
    _mem_set(key, value, ttl)
    with _stats_lock:
        _stats["sets"] += 1

    if _upstash_ready():
        try:
            _command(["SET", key, value, "EX", max(1, int(ttl))])
            _upstash_ok()
        except Exception as exc:  # noqa: BLE001 - fail open
            _upstash_error("SET", exc)
    return True


def delete(*keys: str) -> None:
    if not CACHE_ENABLED:
        return
    with _mem_lock:
        for key in keys:
            _mem.pop(key, None)
    if not _upstash_ready():
        return
    try:
        for key in keys:
            _command(["DEL", key])
        _upstash_ok()
    except Exception as exc:  # noqa: BLE001 - fail open
        _upstash_error("DEL", exc)


def set_json(key: str, value: Any, ttl: int = READ_TTL) -> bool:
    try:
        raw = json.dumps(value, default=str, separators=(",", ":"))
    except (TypeError, ValueError):
        return False
    return set(key, raw, ttl)


def get_json(key: str, default: Any = None) -> Any:
    raw = get(key)
    if raw is None:
        return default
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        with _stats_lock:
            _stats["errors"] += 1
        return default


# ---------------------------------------------------------------------------
# Cache generations / SQL keys
# ---------------------------------------------------------------------------

def version() -> str:
    """Return the current read-cache generation.

    Bumped on every ledger write. Cached in-process for one second so a burst
    of reads does not turn into a burst of Upstash GETs, while other workers
    still observe a write within about a second.
    """
    global _version_local, _version_at
    if not CACHE_ENABLED:
        return "0"

    now = time.time()
    with _version_lock:
        if _version_local and now - _version_at < 1.0:
            return _version_local

    value: str | None = None
    if _upstash_ready():
        try:
            raw = _command(["GET", VERSION_KEY])
            if raw is None:
                seed = str(int(time.time()))
                _command(["SET", VERSION_KEY, seed, "NX"])
                raw = _command(["GET", VERSION_KEY]) or seed
            value = str(raw)
            _upstash_ok()
        except Exception as exc:  # noqa: BLE001 - fail open
            _upstash_error("VERSION", exc)

    if not value:
        value = _version_local or str(int(time.time()))
    with _version_lock:
        _version_local = value
        _version_at = now
    return value


def bump_version() -> str:
    """Invalidate every cached SQL read after a write."""
    global _version_local, _version_at
    if not CACHE_ENABLED:
        return "0"

    value: int | str | None = None
    if _upstash_ready():
        try:
            raw = _command(["INCR", VERSION_KEY])
            if raw is None:
                _command(["SET", VERSION_KEY, str(int(time.time())), "NX"])
                raw = _command(["INCR", VERSION_KEY])
            value = int(raw) if raw is not None else None
            _upstash_ok()
        except Exception as exc:  # noqa: BLE001 - fail open
            _upstash_error("INCR", exc)

    if value is None:
        try:
            value = int(_version_local or time.time()) + 1
        except (TypeError, ValueError):
            value = int(time.time()) + 1

    new_version = str(value)
    with _version_lock:
        _version_local = new_version
        _version_at = time.time()
    return new_version


def sql_key(sql: str, params: tuple | list = ()) -> str:
    payload = sql + "\x1f" + json.dumps(
        list(params), default=str, sort_keys=True, separators=(",", ":")
    )
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]
    return f"{KEY_PREFIX}:sql:{version()}:{digest}"


# ---------------------------------------------------------------------------
# Observability / test helpers
# ---------------------------------------------------------------------------

def stats() -> dict:
    with _stats_lock:
        snapshot = dict(_stats)
    attempts = snapshot["hits"] + snapshot["misses"]
    snapshot["hit_rate"] = round(snapshot["hits"] / attempts, 3) if attempts else 0.0
    with _circuit_lock:
        circuit_open = time.time() < _circuit_open_until
    return {
        **snapshot,
        "backend": backend(),
        "enabled": CACHE_ENABLED,
        "circuit_open": circuit_open,
    }


def status() -> dict:
    return stats()


def reset_local() -> None:
    """Clear the in-process cache/stats. Never touches a real Upstash DB."""
    global _version_local, _version_at
    with _mem_lock:
        _mem.clear()
    with _stats_lock:
        for key in _stats:
            _stats[key] = 0
    with _version_lock:
        _version_local = ""
        _version_at = 0.0
    with _circuit_lock:
        _consecutive_errors = 0
        _circuit_open_until = 0.0
