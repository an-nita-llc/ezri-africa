"""Upstash Redis Client Helper for Caching, Rate Limiting & FX Rates.
Uses UPSTASH_REDIS_REST_URL or REDIS_URL with fallback when keys are unset.
"""
from __future__ import annotations
import os
import httpx

REDIS_URL = os.environ.get("REDIS_URL", "").strip()
REST_URL = os.environ.get("UPSTASH_REDIS_REST_URL", "").strip()
REST_TOKEN = os.environ.get("UPSTASH_REDIS_REST_TOKEN", "").strip()

# Memory cache fallback when Redis keys are unset
_local_cache: dict[str, str] = {}


async def redis_set(key: str, value: str, ttl_seconds: int = 3600) -> bool:
    if REST_URL and REST_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                headers = {"Authorization": f"Bearer {REST_TOKEN}"}
                res = await client.get(f"{REST_URL}/set/{key}/{value}/EX/{ttl_seconds}", headers=headers)
                return res.status_code == 200
        except Exception as e:
            print(f"[Upstash Redis Error] SET: {e}")

    _local_cache[key] = value
    return True


async def redis_get(key: str) -> str | None:
    if REST_URL and REST_TOKEN:
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                headers = {"Authorization": f"Bearer {REST_TOKEN}"}
                res = await client.get(f"{REST_URL}/get/{key}", headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("result")
        except Exception as e:
            print(f"[Upstash Redis Error] GET: {e}")

    return _local_cache.get(key)
