import json
from pathlib import Path

from buzzard_ai_complete.complete_commerce_platform.orders.service import OrderService
from buzzard_ai_complete.complete_commerce_platform.service import CompleteCommercePlatformService, MemoryRepo

MODULE_DATA = Path(__file__).resolve().parents[1] / "complete_commerce_platform" / "data"
MODULE_ROOT = Path(__file__).resolve().parents[1] / "complete_commerce_platform"


def test_taxonomy():
    taxonomy = json.loads((MODULE_DATA / "taxonomy.json").read_text(encoding="utf-8"))
    assert len([node for node in taxonomy["nodes"] if node["level"] == 1]) == 43


def test_events():
    events = CompleteCommercePlatformService().events_schema()
    assert "order.paid" in events["events"]


def test_production_gate():
    assert (MODULE_ROOT / "deployment" / "PRODUCTION_CHECKLIST.md").exists()


def test_order_transition():
    repo = MemoryRepo()
    repo.save("ord-1", {"order_id": "ord-1", "status": "pending_payment"})
    service = OrderService(repo)
    updated = service.transition("ord-1", "paid")
    assert updated["status"] == "paid"


def test_platform_demo():
    demo = CompleteCommercePlatformService().demo_flow()
    assert demo["health"]["status"] == "integration_ready"
    assert demo["checkout"]["order_status"] == "paid"
    assert demo["events"][0]["order_id"] == "ord-1"
    assert "password" not in demo["security"]
