"""Phase 3 Wave 1 idempotency service tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.services.idempotency_service import IdempotencyService


def test_idempotency_reserve_and_complete(session):
    svc = IdempotencyService(session)
    record = svc.reserve("replay-key-1", resource_type="event_replay")
    assert record is not None
    svc.complete("replay-key-1", {"event_id": "evt-1"}, resource_id="evt-1")
    stored = svc.get("replay-key-1")
    assert stored is not None
    assert stored.result == {"event_id": "evt-1"}


def test_idempotency_execute_once_is_stable(session):
    svc = IdempotencyService(session)
    calls = {"count": 0}

    def handler():
        calls["count"] += 1
        return {"count": calls["count"]}

    first = svc.execute_once("exec-key", resource_type="commerce_write", handler=handler)
    second = svc.execute_once("exec-key", resource_type="commerce_write", handler=handler)
    assert first == second == {"count": 1}
    assert calls["count"] == 1
