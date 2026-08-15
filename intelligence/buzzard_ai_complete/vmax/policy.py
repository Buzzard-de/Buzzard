class PolicyEngine:
    def __init__(self):
        self.rules = {}

    def add(self, name, allowed=True, reason=""):
        self.rules[name] = {"allowed": bool(allowed), "reason": reason}

    def check(self, name):
        return self.rules.get(name, {"allowed": False, "reason": "rule_not_defined"})

    def count(self):
        return len(self.rules)
