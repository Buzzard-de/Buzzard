class E2ERunner:
    def __init__(self, steps):
        self.steps = steps

    def run(self):
        results = []
        for name, fn in self.steps:
            try:
                result = fn()
                results.append({"step": name, "passed": bool(result)})
            except Exception as exc:
                results.append({"step": name, "passed": False, "error": type(exc).__name__})
        return {"passed": all(step["passed"] for step in results), "steps": results}
