import json
from decimal import Decimal
from pathlib import Path

from buzzard_ai_complete.production_integration_maximal.business_engine.customer_intelligence.engine import (
    CustomerIntelligence,
)
from buzzard_ai_complete.production_integration_maximal.business_engine.finance.engine import FinanceEngine
from buzzard_ai_complete.production_integration_maximal.business_engine.forecasting.engine import ForecastEngine
from buzzard_ai_complete.production_integration_maximal.business_engine.knowledge_graph.graph import KnowledgeGraph
from buzzard_ai_complete.production_integration_maximal.business_engine.pricing.engine import PricingEngine
from buzzard_ai_complete.production_integration_maximal.business_engine.rma.service import RMAService
from buzzard_ai_complete.production_integration_maximal.business_engine.supplier_intelligence.engine import (
    SupplierIntelligence,
)
from buzzard_ai_complete.production_integration_maximal.integrations.health.readiness import Readiness
from buzzard_ai_complete.production_integration_maximal.integrations.suppliers.feed_contract import (
    SupplierNormalizer,
)
from buzzard_ai_complete.production_integration_maximal.integrations.webhooks.idempotency import IdempotencyStore
from buzzard_ai_complete.production_integration_maximal.integrations.webhooks.security import verify_hmac

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
DEPLOY_DIR = Path(__file__).resolve().parent / "deployment"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"


class MemoryRmaRepo:
    def __init__(self):
        self.data = {}
        self._counter = 0

    def get(self, key):
        return self.data.get(key)

    def save(self, key, value=None):
        if value is None:
            self.data[key["rma_id"]] = key
        else:
            self.data[key] = value

    def new_id(self):
        self._counter += 1
        return f"rma_{self._counter}"


class ProductionIntegrationService:
    def load_production_config(self):
        return json.loads((CONFIG_DIR / "integrations.production.json").read_text(encoding="utf-8"))

    def provider_registry(self):
        return json.loads((CONFIG_DIR / "provider_registry.json").read_text(encoding="utf-8"))

    def advanced_engines_config(self):
        return json.loads((CONFIG_DIR / "advanced_engines.json").read_text(encoding="utf-8"))

    def advanced_systems_schema(self):
        path = SCHEMA_DIR / "advanced_systems.json"
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}

    def health(self):
        config = self.load_production_config()
        return {
            "service": "production-integration-maximal",
            "status": "production_integration_ready",
            "live_activation": config.get("live_activation", False),
            "https_required": config.get("deployment", {}).get("https_required", True),
            "runbook": (DOCS_DIR / "PRODUCTION_FINAL_RUNBOOK.md").exists(),
            "preflight_script": (DEPLOY_DIR / "scripts" / "preflight.py").exists(),
        }

    def readiness(self):
        config = self.load_production_config()
        return Readiness(
            {
                "production_config": lambda: bool(config),
                "https_policy": lambda: config.get("deployment", {}).get("https_required", False),
                "telephony_webhooks": lambda: config.get("telephony", {}).get("signed_webhooks", False),
                "payment_webhooks": lambda: config.get("payment", {}).get("webhook_verification", False),
            }
        ).run()

    def demo_flow(self):
        store = IdempotencyStore()
        store.put("pay-key-1", {"id": "p1", "status": "dry_run"})
        supplier = SupplierNormalizer().normalize(
            {"sku": "S1", "title": "Demo Part", "price": "10", "currency": "EUR", "stock": 4}
        )
        pricing = PricingEngine(
            type("R", (), {"get": lambda self, p: {"sale_price": "20"}})(),
            {"target_margin": "0.11"},
        )
        finance = FinanceEngine().order_margin(100, 60, 10, 5, 0)
        forecast = ForecastEngine().forecast([1, 2, 3, 4], 3)
        rma_repo = MemoryRmaRepo()
        rma = RMAService(rma_repo)
        rma_record = rma.create("ord-1", ["prod-1"], "damaged")
        rma.transition(rma_record["rma_id"], "approved")
        graph = KnowledgeGraph()
        graph.upsert_node("p1", "product")
        graph.upsert_node("v1", "vehicle")
        graph.link("p1", "compatible_with", "v1", ["catalog"])
        return {
            "health": self.health(),
            "readiness": self.readiness(),
            "idempotency": store.get("pay-key-1"),
            "supplier_normalized": supplier,
            "pricing": pricing.recommend({"product_id": "p1", "cost": "10"}),
            "finance": finance,
            "forecast": forecast,
            "rma_status": rma_record["status"],
            "customer_segment": CustomerIntelligence().segment(0, 0, 0),
            "supplier_rank": SupplierIntelligence().rank(
                {"a": {"price": 90, "availability": 80, "delivery": 70, "quality": 90, "returns": 90}}
            ),
            "graph_neighbors": graph.neighbors("p1"),
            "hmac_ok": verify_hmac(
                "test",
                b'{"ok":true}',
                __import__("hmac").new(b"test", b'{"ok":true}', __import__("hashlib").sha256).hexdigest(),
            ),
            "pricing_margin": str(Decimal(pricing.recommend({"product_id": "p1", "cost": "10"})["recommended_price"])),
        }
