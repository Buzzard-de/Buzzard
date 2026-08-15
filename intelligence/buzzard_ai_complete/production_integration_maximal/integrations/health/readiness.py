class Readiness:
    def __init__(self, checks):
        self.checks = checks

    def run(self):
        results = {}
        ready = True
        for name, check in self.checks.items():
            try:
                results[name] = bool(check())
            except Exception:
                results[name] = False
            ready = ready and results[name]
        return {"ready": ready, "checks": results}
