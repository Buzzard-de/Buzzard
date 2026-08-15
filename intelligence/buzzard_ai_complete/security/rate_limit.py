import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, limit=60, window_seconds=60):
        self.limit, self.window = limit, window_seconds
        self.hits = defaultdict(list)

    def allow(self, key):
        now = time.time()
        self.hits[key] = [t for t in self.hits[key] if now - t < self.window]
        if len(self.hits[key]) >= self.limit:
            return False
        self.hits[key].append(now)
        return True
