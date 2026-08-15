class ToolGateway:
    def __init__(
        self,
        product_search=None,
        inventory_price=None,
        compatibility=None,
        create_lead=None,
        human_handoff=None,
    ):
        self.product_search = product_search
        self.inventory_price = inventory_price
        self.compatibility = compatibility
        self.create_lead = create_lead
        self.human_handoff = human_handoff

    def search_products(self, **kwargs):
        if not self.product_search:
            return {"status": "unavailable", "items": []}
        return self.product_search(**kwargs)

    def lookup_inventory_price(self, **kwargs):
        if not self.inventory_price:
            return {"status": "unavailable"}
        return self.inventory_price(**kwargs)

    def lookup_compatibility(self, **kwargs):
        if not self.compatibility:
            return {"status": "unavailable"}
        return self.compatibility(**kwargs)

    def lead(self, **kwargs):
        if not self.create_lead:
            return {"status": "unavailable"}
        return self.create_lead(**kwargs)

    def handoff(self, **kwargs):
        if not self.human_handoff:
            return {"status": "unavailable"}
        return self.human_handoff(**kwargs)
