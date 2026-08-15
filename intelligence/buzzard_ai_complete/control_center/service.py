from buzzard_ai_complete.control_center.command_router import CommandRouter
from buzzard_ai_complete.control_center.end_to_end import EndToEndPlan
from buzzard_ai_complete.control_center.incidents import IncidentManager
from buzzard_ai_complete.control_center.integration_status import IntegrationStatus
from buzzard_ai_complete.control_center.orchestrator import ControlCenter


class OnePieceControlService:
    def __init__(self, center=None):
        self.center = center or ControlCenter()
        self.router = CommandRouter()
        self.incidents = IncidentManager()
        self.integrations = IntegrationStatus()
        self.e2e = EndToEndPlan()

    def demo_flow(self):
        center = self.center
        center.register_workflow("order_to_delivery", ["order", "payment", "fulfillment", "logistics"])
        center.access.grant("aslan_bey", "operations")
        event_results = center.emit("ORDER_CREATED", {"id": "O-DEMO"})

        for provider in ("ebay", "google_ads", "meta_ads", "stripe", "dhl"):
            self.integrations.set(provider, "NOT_CONFIGURED")

        self.router.register("ping", lambda payload: {"status": "OK", "payload": payload})
        incident = self.incidents.open("LOW", "demo_check")
        self.incidents.close(incident["id"])

        return {
            "workflow": center.execute_workflow("order_to_delivery"),
            "authorization": center.authorize("aslan_bey", "operations"),
            "event_results": event_results,
            "health": center.health(),
            "command": self.router.dispatch("ping", {"demo": True}),
            "integrations": self.integrations.snapshot(),
            "incident": incident,
            "e2e_plan": self.e2e.plan("O-DEMO"),
        }

    def e2e_plan(self, order_id):
        return self.e2e.plan(order_id)
