class IntegrationStatus:
    def __init__(self):
        self.providers = {}

    def set(self, name, status, details=None):
        self.providers[name] = {"status": status, "details": details or {}}

    def snapshot(self):
        return dict(self.providers)
