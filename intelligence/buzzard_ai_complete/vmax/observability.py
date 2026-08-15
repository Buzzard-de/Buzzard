class Metrics:
    def __init__(self):
        self.counters = {}

    def inc(self, name, value=1):
        self.counters[name] = self.counters.get(name, 0) + value

    def snapshot(self):
        return dict(self.counters)
