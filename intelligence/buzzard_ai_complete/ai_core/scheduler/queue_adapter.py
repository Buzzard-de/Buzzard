from __future__ import annotations

from typing import Any, Callable


class QueueAdapter:
    """Optional distributed queue adapter — in-process fallback when no external queue configured."""

    def __init__(self) -> None:
        self._pending: list[dict[str, Any]] = []

    def enqueue(self, task_type: str, payload: dict[str, Any], *, correlation_id: str | None = None) -> dict[str, Any]:
        item = {
            "task_type": task_type,
            "payload": payload,
            "correlation_id": correlation_id,
            "status": "queued",
        }
        self._pending.append(item)
        return {"status": "queued", "queue": "in_process", "position": len(self._pending)}

    def dequeue(self) -> dict[str, Any] | None:
        if not self._pending:
            return None
        return self._pending.pop(0)

    def process_next(self, handler: Callable[[str, dict[str, Any]], Any]) -> dict[str, Any] | None:
        item = self.dequeue()
        if item is None:
            return None
        result = handler(item["task_type"], item["payload"])
        return {"item": item, "result": result}

    @property
    def pending_count(self) -> int:
        return len(self._pending)
