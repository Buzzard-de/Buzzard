class FeatureFlags:
    def __init__(self):
        self.flags = {}

    def set(self, name, enabled):
        self.flags[name] = bool(enabled)

    def enabled(self, name):
        return self.flags.get(name, False)
