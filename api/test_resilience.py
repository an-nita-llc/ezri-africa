"""Resilience tests: cache fallback, read failover, dual writes, session cache."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import cache
import ledger


def _targets(monkeypatch):
    primary = ledger.DBTarget("primary", "postgres://primary", "postgres://primary")
    secondary = ledger.DBTarget("secondary", "postgres://secondary", "postgres://secondary")
    monkeypatch.setattr(ledger, "_TARGETS", [primary, secondary])
    return primary, secondary


def test_memory_cache_ttl_and_stats(monkeypatch):
    monkeypatch.setattr(cache, "CACHE_ENABLED", True)
    monkeypatch.setattr(cache, "REST_URL", "")
    monkeypatch.setattr(cache, "REST_TOKEN", "")
    cache.reset_local()

    assert cache.set_json("unit-key", {"ok": True}, ttl=5)
    assert cache.get_json("unit-key") == {"ok": True}
    stats = cache.stats()
    assert stats["backend"] == "memory"
    assert stats["hits"] == 1
    assert stats["sets"] == 1

    first = cache.version()
    bumped = cache.bump_version()
    assert bumped != first


def test_target_status_remembers_failure(monkeypatch):
    target = ledger.DBTarget("unit", "postgres://unit", "postgres://unit")
    ledger._record_failure(target, RuntimeError("down"))
    target.cooldown_until = 0.0
    assert target.status() == "down"

    ledger._record_success(target, 10.0)
    assert target.status() == "up"


def test_reads_fail_over_and_writes_mirror(monkeypatch):
    monkeypatch.setattr(cache, "CACHE_ENABLED", False)
    primary, _secondary = _targets(monkeypatch)
    calls = []

    def fake_run(target, query, params):
        calls.append((target.name, query))
        if target.name == "primary" and query.lstrip().upper().startswith("SELECT"):
            raise RuntimeError("primary read down")
        if query.lstrip().upper().startswith("SELECT"):
            return [{"id": "EZR-1"}]
        return []

    monkeypatch.setattr(ledger, "_run_on_target", fake_run)

    assert ledger._execute("SELECT * FROM escrows WHERE id=?", ("EZR-1",)) == [{"id": "EZR-1"}]
    assert calls[0][0] == "primary"
    assert calls[-1][0] == "secondary"
    assert primary.status() == "down"

    # A write should mirror to both doors once the primary is tried again.
    primary.cooldown_until = 0.0
    primary.cooldown_reason = ""
    calls.clear()
    ledger._execute("UPDATE escrows SET status=? WHERE id=?", ("HELD", "EZR-1"))
    assert [name for name, _ in calls] == ["primary", "secondary"]


def test_primary_write_failure_uses_secondary(monkeypatch):
    monkeypatch.setattr(cache, "CACHE_ENABLED", False)
    primary, secondary = _targets(monkeypatch)
    calls = []

    def fake_run(target, query, params):
        calls.append((target.name, query))
        if target.name == "primary":
            raise RuntimeError("primary write down")
        return []

    monkeypatch.setattr(ledger, "_run_on_target", fake_run)

    ledger._execute("UPDATE escrows SET status=? WHERE id=?", ("HELD", "EZR-3"))
    assert [name for name, _ in calls] == ["primary", "secondary"]
    assert primary.status() == "down"
    assert secondary.status() == "up"


def test_empty_read_checks_the_second_door(monkeypatch):
    monkeypatch.setattr(cache, "CACHE_ENABLED", False)
    _targets(monkeypatch)
    seen = []

    def fake_run(target, query, params):
        seen.append(target.name)
        if target.name == "primary":
            return []
        return [{"id": "ONLY-ON-SECONDARY"}]

    monkeypatch.setattr(ledger, "_run_on_target", fake_run)

    rows = ledger._execute("SELECT * FROM escrows WHERE id=?", ("EZR-2",))
    assert rows == [{"id": "ONLY-ON-SECONDARY"}]
    assert seen == ["primary", "secondary"]


def test_user_and_session_cache_invalidate(monkeypatch, tmp_path):
    monkeypatch.setattr(ledger, "DB", str(tmp_path / "cache-test.db"))
    monkeypatch.setattr(ledger, "_TARGETS", [])
    monkeypatch.setattr(cache, "CACHE_ENABLED", True)
    monkeypatch.setattr(cache, "REST_URL", "")
    monkeypatch.setattr(cache, "REST_TOKEN", "")
    cache.reset_local()

    email = "cache-test@example.com"
    assert ledger.create_user("Cache Test", email, "pass1234")["email"] == email

    cache.reset_local()
    assert ledger.get_user(email)["email"] == email
    first = cache.stats()["hits"]
    assert ledger.get_user(email)["email"] == email
    assert cache.stats()["hits"] == first + 1

    updated = ledger.update_user_profile(email, name="Fresh Name")
    assert updated["name"] == "Fresh Name"
    assert ledger.get_user(email)["name"] == "Fresh Name"

    token = ledger.create_session(email)
    before = cache.stats()["hits"]
    assert ledger.get_session_email(token) == email
    assert cache.stats()["hits"] == before + 1
