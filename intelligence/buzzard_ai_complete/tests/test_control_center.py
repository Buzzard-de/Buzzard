from buzzard_ai_complete.control_center.command_router import CommandRouter
from buzzard_ai_complete.control_center.end_to_end import EndToEndPlan
from buzzard_ai_complete.control_center.incidents import IncidentManager
from buzzard_ai_complete.control_center.integration_status import IntegrationStatus
from buzzard_ai_complete.control_center.orchestrator import ControlCenter


def test_event_bus():
    center = ControlCenter()
    seen = []
    center.bus.subscribe("ORDER_CREATED", lambda event: seen.append(event.payload["id"]) or "OK")
    assert center.emit("ORDER_CREATED", {"id": "O1"}) == ["OK"]
    assert seen == ["O1"]


def test_workflow_and_authorization():
    center = ControlCenter()
    center.register_workflow("order_to_delivery", ["order", "payment", "fulfillment", "logistics"])
    center.access.grant("aslan_bey", "operations")
    assert center.authorize("aslan_bey", "operations")
    assert center.execute_workflow("order_to_delivery")["status"] == "READY"


def test_command_router():
    router = CommandRouter()
    router.register("ping", lambda payload: {"status": "OK", "payload": payload})
    assert router.dispatch("ping", {"x": 1})["status"] == "OK"
    assert router.dispatch("unknown")["status"] == "UNKNOWN_COMMAND"


def test_incidents():
    incidents = IncidentManager()
    opened = incidents.open("HIGH", "test")
    assert incidents.close(opened["id"])["status"] == "CLOSED"


def test_integrations():
    status = IntegrationStatus()
    status.set("ebay", "NOT_CONFIGURED")
    assert status.snapshot()["ebay"]["status"] == "NOT_CONFIGURED"


def test_end_to_end():
    plan = EndToEndPlan().plan("O1")
    assert plan["steps"][0] == "customer"
    assert plan["steps"][-1] == "audit"
