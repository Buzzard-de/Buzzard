class AbandonedCartEngine:
    def __init__(self):
        self.carts = {}

    def save(self, customer_id, cart):
        self.carts[customer_id] = dict(cart)
        return self.carts[customer_id]

    def recoverable(self, customer_id):
        return customer_id in self.carts and bool(self.carts[customer_id])
