class IdempotencyRegistry:
    def __init__(self):
        self.values = {}

    def execute(self, key, fn):
        if key in self.values:
            return self.values[key]
        result = fn()
        self.values[key] = result
        return result
