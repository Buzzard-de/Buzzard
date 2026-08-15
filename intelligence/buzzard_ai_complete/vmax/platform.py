from buzzard_ai_complete.vmax.audit import AuditTrail
from buzzard_ai_complete.vmax.health import HealthRegistry
from buzzard_ai_complete.vmax.policy import PolicyEngine
from buzzard_ai_complete.vmax.registry import ModuleRegistry


class BuzzardMaxPlatform:
    def __init__(self):
        self.registry = ModuleRegistry()
        self.audit = AuditTrail()
        self.health = HealthRegistry()
        self.policy = PolicyEngine()

    def register_module(self, name, version, capabilities):
        return self.registry.register(name, version, capabilities)

    def snapshot(self):
        return {
            "modules": self.registry.snapshot(),
            "health": self.health.snapshot(),
            "audit_events": len(self.audit.events),
            "policy_rules": self.policy.count(),
        }
