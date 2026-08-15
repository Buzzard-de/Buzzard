class AISalesEngine:
    """Recommendation engine; it proposes, never invents stock/price."""
    def __init__(self, catalog, inventory, pricing, customer_context=None):
        self.catalog = catalog
        self.inventory = inventory
        self.pricing = pricing
        self.customer_context = customer_context

    def recommend(self, query, customer_id=None, limit=5):
        candidates = self.catalog.search(query, limit=limit * 4)
        ranked = []
        for p in candidates:
            stock = self.inventory.available(p["product_id"])
            if stock <= 0:
                continue
            price = self.pricing.current(p["product_id"])
            ranked.append({
                "product": p,
                "price": price,
                "stock": stock,
                "reason": "query_match"
            })
        return ranked[:limit]

    def cross_sell(self, product_id, limit=4):
        return self.catalog.complements(product_id)[:limit]
