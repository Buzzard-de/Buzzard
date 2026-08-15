class ProviderRegistry:
    def __init__(self):
        self.providers = {}

    def register(self, name, provider):
        self.providers[name] = provider

    def health(self):
        return {name: provider.status() for name, provider in self.providers.items()}
