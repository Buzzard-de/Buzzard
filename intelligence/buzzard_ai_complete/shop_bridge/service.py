from buzzard_ai_complete.production.catalog import Catalog, Product
from buzzard_ai_complete.production.checkout import CheckoutEngine
from buzzard_ai_complete.production.pricing import PricingGuard
from buzzard_ai_complete.production.service import ProductionMaxService
from buzzard_ai_complete.shop_bridge.bridge import ShopIntelligenceBridge
from buzzard_ai_complete.shop_bridge.metrics_adapter import CommerceAnalyticsAdapter


class ShopBridgeService:
    def __init__(self):
        self.catalog = Catalog()
        self.checkout = CheckoutEngine(self.catalog, PricingGuard())
        self.bridge = ShopIntelligenceBridge(self.catalog, self.checkout)
        self.production = ProductionMaxService()

    def _external_status(self):
        integrations = self.production.integration_registry().status()
        return {
            "payment": "READY"
            if integrations["payment"]["status"] == "CONFIGURED"
            else "BLOCKED",
            "shipping": "READY"
            if integrations["carrier"]["status"] == "CONFIGURED"
            else "BLOCKED",
        }

    def readiness(self):
        return self.bridge.readiness(self._external_status())

    def demo_flow(self):
        self.catalog.upsert(Product("S1", "Test Product", "Test", 50, 10))
        cart = self.checkout.create_cart()
        self.checkout.add(cart.cart_id, "S1", 1)
        quote = self.checkout.quote(cart.cart_id)
        order = self.bridge.orders.create(
            {
                "order_id": "O-DEMO",
                "customer_id": "C-DEMO",
                "country": "DE",
                "lines": quote["lines"],
                "subtotal": quote["subtotal"],
            }
        )
        self.bridge.payment_confirmed(order, "PAY-DEMO")
        self.bridge.orders.start_fulfillment(order)
        self.bridge.shipped(order, "TRACK-DEMO")
        self.bridge.delivered(order)
        return {
            "readiness": self.readiness(),
            "order": order.__dict__,
            "events": self.bridge.events.snapshot(),
            "analytics_rows": CommerceAnalyticsAdapter().convert(self.bridge.events.events),
        }
