class HealthRegistry:
    def __init__(self):
        self.services = {}

    def set(self, name, status, details=None):
        self.services[name] = {"status": status, "details": details or {}}

    def snapshot(self):
        return dict(self.services)
