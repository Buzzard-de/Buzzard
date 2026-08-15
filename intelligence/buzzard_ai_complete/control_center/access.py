class AccessControl:
    def __init__(self):
        self.roles = {}

    def grant(self, principal, role):
        self.roles.setdefault(principal, set()).add(role)

    def allowed(self, principal, role):
        return role in self.roles.get(principal, set())
