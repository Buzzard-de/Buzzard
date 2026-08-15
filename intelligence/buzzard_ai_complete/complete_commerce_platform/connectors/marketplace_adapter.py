class MarketplaceAdapter:
    def map_category(self, canonical_id):
        raise NotImplementedError

    def upsert_product(self, product):
        raise NotImplementedError

    def update_price_stock(self, product_id, price, stock):
        raise NotImplementedError

    def deactivate(self, product_id):
        raise NotImplementedError
