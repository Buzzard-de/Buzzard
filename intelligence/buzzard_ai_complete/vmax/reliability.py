import time


class RetryPolicy:
    def __init__(self, max_attempts=3, base_delay=0.1):
        self.max_attempts = max_attempts
        self.base_delay = base_delay

    def run(self, fn):
        last = None
        for attempt in range(1, self.max_attempts + 1):
            try:
                return fn()
            except Exception as exc:
                last = exc
                if attempt < self.max_attempts:
                    time.sleep(self.base_delay * (2 ** (attempt - 1)))
        raise last
