class ModuleRegistry:
    def __init__(self):
        self.modules = {}

    def register(self, name, version, capabilities):
        self.modules[name] = {"version": version, "capabilities": list(capabilities)}
        return self.modules[name]

    def snapshot(self):
        return dict(self.modules)
