class SupplierGateway:
    def __init__(self, suppliers=None):
        self.suppliers = suppliers or {}

    def select(self, items, country):
        candidates = []
        for name, data in self.suppliers.items():
            if all(data.get("stock", {}).get(i.sku, 0) >= i.quantity for i in items):
                if not data.get("countries") or country in data["countries"]:
                    candidates.append((name, data.get("priority", 999)))
        return min(candidates, key=lambda x: x[1])[0] if candidates else None
