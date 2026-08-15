class IdempotencyStore:
    def __init__(self):
        self.results = {}

    def get(self, key):
        return self.results.get(key)

    def put(self, key, result):
        self.results[key] = result
        return result
