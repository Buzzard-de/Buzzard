class SupplierRegistry:
    def __init__(self):
        self.providers = {}

    def register(self, name, provider):
        self.providers[name] = provider

    def health(self):
        return {name: provider.health() for name, provider in self.providers.items()}

    def sync(self, name):
        provider = self.providers[name]
        payload = provider.fetch()
        items = provider.parse(payload)
        return {"supplier": name, "items": len(items), "data": items}
