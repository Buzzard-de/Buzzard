import hashlib
import hmac
import json
from pathlib import Path

from buzzard_ai_complete.production_integration_maximal.business_engine.finance.engine import FinanceEngine
from buzzard_ai_complete.production_integration_maximal.business_engine.forecasting.engine import ForecastEngine
from buzzard_ai_complete.production_integration_maximal.business_engine.knowledge_graph.graph import KnowledgeGraph
from buzzard_ai_complete.production_integration_maximal.business_engine.pricing.engine import PricingEngine
from buzzard_ai_complete.production_integration_maximal.business_engine.rma.service import RMAService
from buzzard_ai_complete.production_integration_maximal.integrations.health.readiness import Readiness
from buzzard_ai_complete.production_integration_maximal.integrations.suppliers.feed_contract import SupplierNormalizer
from buzzard_ai_complete.production_integration_maximal.integrations.webhooks.idempotency import IdempotencyStore
from buzzard_ai_complete.production_integration_maximal.integrations.webhooks.security import verify_hmac
from buzzard_ai_complete.production_integration_maximal.service import ProductionIntegrationService

MODULE_ROOT = Path(__file__).resolve().parents[1] / "production_integration_maximal"


class Repo:
    def __init__(self):
        self.data = {}

    def get(self, key):
        return self.data.get(key)

    def save(self, key, value=None):
        if value is None:
            self.data[key["rma_id"]] = key
        else:
            self.data[key] = value

    def new_id(self):
        return "rma_test"


def test_payment_idempotency():
    store = IdempotencyStore()
    store.put("k", {"id": "p1"})
    assert store.get("k")["id"] == "p1"


def test_webhook_hmac():
    secret = "test"
    body = b'{"ok":true}'
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    assert verify_hmac(secret, body, sig)


def test_supplier_normalization():
    normalizer = SupplierNormalizer()
    item = normalizer.normalize({"sku": "S1", "title": "Test", "price": "10", "currency": "EUR", "stock": 4})
    assert item["supplier_sku"] == "S1"


def test_readiness():
    result = Readiness({"a": lambda: True, "b": lambda: True}).run()
    assert result["ready"] is True


def test_production_config():
    config = json.loads((MODULE_ROOT / "config" / "integrations.production.json").read_text())
    assert config["deployment"]["https_required"] is True
    assert config["telephony"]["signed_webhooks"] is True


def test_runbook_gate():
    assert (MODULE_ROOT / "docs" / "PRODUCTION_FINAL_RUNBOOK.md").exists()


def test_pricing():
    repo = type("R", (), {"get": lambda self, p: {"sale_price": "20"}})()
    engine = PricingEngine(repo, {"target_margin": "0.11"})
    from decimal import Decimal

    assert Decimal(engine.recommend({"product_id": "p", "cost": "10"})["recommended_price"]) > 10


def test_forecast():
    assert len(ForecastEngine().forecast([1, 2, 3, 4], 3)["daily_forecast"]) == 3


def test_finance():
    result = FinanceEngine().order_margin(100, 60, 10, 5, 0)
    assert result["contribution"] == "25"


def test_rma():
    service = RMAService(Repo())
    record = service.create("o", ["p"], "damaged")
    assert record["status"] == "requested"
    assert service.transition(record["rma_id"], "approved")["status"] == "approved"


def test_graph():
    graph = KnowledgeGraph()
    graph.upsert_node("p1", "product")
    graph.upsert_node("v1", "vehicle")
    graph.link("p1", "compatible_with", "v1", ["catalog"])
    assert graph.neighbors("p1")[0]["target"] == "v1"


def test_production_demo():
    demo = ProductionIntegrationService().demo_flow()
    assert demo["health"]["status"] == "production_integration_ready"
    assert demo["readiness"]["ready"] is True
