import time


class TokenBucket:
    def __init__(self, capacity=10, refill_per_second=1):
        self.capacity = capacity
        self.tokens = float(capacity)
        self.refill = refill_per_second
        self.last = time.monotonic()

    def allow(self, cost=1):
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.refill)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True
        return False
