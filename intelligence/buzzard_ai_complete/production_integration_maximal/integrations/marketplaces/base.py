class MarketplaceProvider:
    name = "base"

    def publish_product(self, product):
        raise NotImplementedError

    def update_price_stock(self, external_id, price, stock):
        raise NotImplementedError

    def deactivate(self, external_id):
        raise NotImplementedError

    def order_import(self):
        raise NotImplementedError

    def verify_webhook(self, headers, body):
        raise NotImplementedError

    def parse_webhook(self, body):
        raise NotImplementedError
