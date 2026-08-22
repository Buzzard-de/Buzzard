from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from buzzard_ai_complete.config import settings


class RateLimiter:
    """In-memory per-actor rate limiter."""

    def __init__(self, limit_per_minute: int | None = None) -> None:
        self.limit = limit_per_minute or settings.RATE_LIMIT_PER_MINUTE
        self._events: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def allow(self, actor: str) -> bool:
        now = time.monotonic()
        window_start = now - 60.0
        with self._lock:
            timestamps = [t for t in self._events[actor] if t >= window_start]
            if len(timestamps) >= self.limit:
                self._events[actor] = timestamps
                return False
            timestamps.append(now)
            self._events[actor] = timestamps
            return True

    def reset(self, actor: str | None = None) -> None:
        with self._lock:
            if actor is None:
                self._events.clear()
            else:
                self._events.pop(actor, None)
