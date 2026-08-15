from buzzard_ai_complete.control_center.access import AccessControl
from buzzard_ai_complete.control_center.events import Event, EventBus
from buzzard_ai_complete.vmax.platform import BuzzardMaxPlatform


class ControlCenter:
    """Central coordination layer for the existing Buzzard modules."""

    def __init__(self):
        self.platform = BuzzardMaxPlatform()
        self.bus = EventBus()
        self.access = AccessControl()
        self.workflows = {}

    def register_workflow(self, name, steps):
        self.workflows[name] = list(steps)

    def emit(self, name, payload=None, source="system"):
        return self.bus.publish(Event(name, payload or {}, source))

    def health(self):
        return self.platform.snapshot()

    def authorize(self, principal, role):
        return self.access.allowed(principal, role)

    def execute_workflow(self, name, context=None):
        if name not in self.workflows:
            return {"status": "NOT_FOUND", "workflow": name}
        return {
            "status": "READY",
            "workflow": name,
            "steps": self.workflows[name],
            "context": context or {},
        }
