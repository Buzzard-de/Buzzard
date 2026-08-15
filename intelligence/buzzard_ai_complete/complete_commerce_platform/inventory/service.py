class InventoryService:
    def __init__(self, repo):
        self.repo = repo

    def available(self, product_id):
        return int((self.repo.get(product_id) or {}).get("available", 0))

    def reserve(self, product_id, quantity):
        if quantity < 1:
            raise ValueError("INVALID_QUANTITY")
        record = self.repo.get(product_id) or {"available": 0, "reserved": 0}
        if record["available"] < quantity:
            raise ValueError("INSUFFICIENT_STOCK")
        record["available"] -= quantity
        record["reserved"] = record.get("reserved", 0) + quantity
        self.repo.save(product_id, record)
        return record

    def release(self, product_id, quantity):
        record = self.repo.get(product_id) or {"available": 0, "reserved": 0}
        record["reserved"] = max(0, record.get("reserved", 0) - quantity)
        record["available"] += quantity
        self.repo.save(product_id, record)
        return record
