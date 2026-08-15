from buzzard_ai_complete.order_engine.idempotency import IdempotencyStore


class OrderOrchestratorV2:
    def __init__(self, engine):
        self.engine = engine
        self.idempotency = IdempotencyStore()

    def process_once(self, order, key):
        cached = self.idempotency.get(key)
        if cached is not None:
            return cached
        result = self.engine.process(order)
        self.idempotency.put(key, result)
        return result
