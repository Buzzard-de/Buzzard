class InventoryGateway:
    def __init__(self, stock=None):
        self.stock = dict(stock or {})

    def available(self, sku, quantity):
        return self.stock.get(sku, 0) >= quantity

    def reserve(self, sku, quantity):
        if not self.available(sku, quantity):
            return False
        self.stock[sku] -= quantity
        return True

    def release(self, sku, quantity):
        self.stock[sku] = self.stock.get(sku, 0) + quantity
