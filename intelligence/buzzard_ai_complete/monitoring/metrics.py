from collections import Counter
from threading import Lock

class Metrics:
    def __init__(self):
        self._counts = Counter()
        self._lock = Lock()

    def inc(self, name, value=1):
        with self._lock:
            self._counts[name] += value

    def snapshot(self):
        with self._lock:
            return dict(self._counts)

metrics = Metrics()
