import io
import json
from decimal import Decimal
from pathlib import Path

from buzzard_ai_complete.complete_commerce_platform.commerce.checkout import CheckoutService
from buzzard_ai_complete.complete_commerce_platform.commerce.core import Cart, CartItem
from buzzard_ai_complete.complete_commerce_platform.connectors.payment_adapter import PaymentAdapter
from buzzard_ai_complete.complete_commerce_platform.integration.event_bus import EventBus
from buzzard_ai_complete.complete_commerce_platform.intelligence.dogu_bey import DoguBeyIntelligence
from buzzard_ai_complete.complete_commerce_platform.inventory.service import InventoryService
from buzzard_ai_complete.complete_commerce_platform.marketplaces.syndication import MarketplaceSyndicator
from buzzard_ai_complete.complete_commerce_platform.observability.audit import AuditLog
from buzzard_ai_complete.complete_commerce_platform.orders.service import OrderService
from buzzard_ai_complete.complete_commerce_platform.security.esat_bey import EsatBeyDefense
from buzzard_ai_complete.complete_commerce_platform.security.guardrails import SecurityPolicy

DATA_DIR = Path(__file__).resolve().parent / "data"
CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DEPLOY_DIR = Path(__file__).resolve().parent / "deployment"


class MemoryRepo:
    def __init__(self):
        self._data = {}

    def get(self, key):
        return self._data.get(key)

    def save(self, key, value):
        self._data[key] = value


class DryRunPaymentAdapter(PaymentAdapter):
    def create_payment_intent(self, amount):
        return {"status": "dry_run", "amount": str(amount), "currency": "EUR"}

    def confirm(self, payment_id):
        return {"status": "dry_run", "payment_id": payment_id}

    def refund(self, payment_id, amount=None):
        return {"status": "dry_run", "payment_id": payment_id, "amount": str(amount or "0")}


class CompleteCommercePlatformService:
    MODULES = [
        "taxonomy",
        "pim",
        "multilingual",
        "supplier_import",
        "commerce",
        "checkout",
        "orders",
        "inventory",
        "logistics",
        "marketplaces",
        "phone_ai",
        "dogu_bey",
        "esat_bey",
        "observability",
    ]

    def load_taxonomy(self):
        return json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))

    def events_schema(self):
        return json.loads((SCHEMA_DIR / "events.json").read_text(encoding="utf-8"))

    def order_schema(self):
        return json.loads((SCHEMA_DIR / "order.schema.json").read_text(encoding="utf-8"))

    def security_policy(self):
        return json.loads((CONFIG_DIR / "security_policy.json").read_text(encoding="utf-8"))

    def channel_mapping_policy(self):
        return json.loads((DATA_DIR / "channel_mapping_policy.json").read_text(encoding="utf-8"))

    def production_checklist_exists(self):
        return (DEPLOY_DIR / "PRODUCTION_CHECKLIST.md").exists()

    def health(self):
        taxonomy = self.load_taxonomy()
        roots = [node for node in taxonomy["nodes"] if node["level"] == 1]
        return {
            "system": "buzzard",
            "service": "complete-commerce-platform",
            "status": "integration_ready",
            "live_side_effects": False,
            "canonical_main_categories": len(roots),
            "production_gate": self.production_checklist_exists(),
        }

    def modules(self):
        return {"modules": self.MODULES}

    def demo_flow(self):
        inventory_repo = MemoryRepo()
        order_repo = MemoryRepo()
        inventory_repo.save("prod-1", {"available": 10, "reserved": 0})
        order_repo.save("ord-1", {"order_id": "ord-1", "status": "pending_payment"})

        inventory = InventoryService(inventory_repo)
        orders = OrderService(order_repo)
        checkout = CheckoutService(inventory, DryRunPaymentAdapter(), orders)

        cart = Cart(cart_id="cart-1", customer_id="cust-demo")
        cart.add(
            CartItem(
                product_id="prod-1",
                sku="DEMO-001",
                quantity=2,
                unit_price=Decimal("19.90"),
            )
        )
        payment_intent = checkout.authorize(cart, "DE")
        inventory.reserve("prod-1", 2)
        paid_order = orders.transition("ord-1", "paid")

        bus = EventBus()
        events = []
        bus.subscribe("order.paid", lambda payload: events.append(payload))
        bus.publish("order.paid", {"order_id": "ord-1", "amount": str(cart.subtotal())})

        audit_buffer = io.StringIO()
        audit = AuditLog(audit_buffer)
        audit_entry = audit.record("system", "checkout.authorize", "ord-1", "dry_run")

        syndicator = MarketplaceSyndicator({})
        marketplace_result = syndicator.publish(
            {"sku": "DEMO-001", "title": "Demo Product"},
            ["Amazon", "eBay"],
        )

        return {
            "health": self.health(),
            "modules": self.modules(),
            "checkout": {
                "subtotal": str(cart.subtotal()),
                "payment_intent": payment_intent,
                "order_status": paid_order["status"],
            },
            "events": events,
            "audit": audit_entry,
            "marketplace": marketplace_result,
            "dogu_bey": DoguBeyIntelligence().propose(
                {"topic": "pricing", "evidence": ["competitor_scan"], "proposal": "review margin"}
            ),
            "esat_bey": EsatBeyDefense().inspect({"failed_auth_count": 0}),
            "security": SecurityPolicy().safe_log(
                {"action": "checkout", "password": "hidden", "amount": "39.80"}
            ),
            "channel_policy": self.channel_mapping_policy(),
        }
