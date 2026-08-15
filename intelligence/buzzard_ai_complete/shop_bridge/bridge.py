from buzzard_ai_complete.shop_bridge.events import CommerceEvent, CommerceEventStore
from buzzard_ai_complete.shop_bridge.feature_gate import SalesGate
from buzzard_ai_complete.shop_bridge.intelligence import IntelligenceHooks
from buzzard_ai_complete.shop_bridge.order_pipeline import OrderPipeline


class ShopIntelligenceBridge:
    def __init__(self, catalog=None, checkout=None, analytics=None, decision=None):
        self.catalog = catalog
        self.checkout = checkout
        self.events = CommerceEventStore()
        self.gate = SalesGate()
        self.orders = OrderPipeline()
        self.intelligence = IntelligenceHooks(analytics, decision)

    def readiness(self, external=None):
        external = external or {}
        status = {
            "catalog": "READY"
            if self.catalog and self.catalog.active_products()
            else "BLOCKED",
            "payment": external.get("payment", "BLOCKED"),
            "shipping": external.get("shipping", "BLOCKED"),
            "order_pipeline": "READY",
            "intelligence_bridge": "READY",
        }
        return {**status, **self.gate.evaluate(status)}

    def emit(self, name, payload=None):
        event = self.events.append(CommerceEvent(name, payload or {}))
        return {
            "event": event.__dict__,
            "intelligence": self.intelligence.on_event(event),
        }

    def create_order(self, checkout, external=None):
        readiness = self.readiness(external)
        if not readiness["sales_enabled"]:
            raise RuntimeError("SALES_BLOCKED:" + ",".join(readiness["missing"]))
        order = self.orders.create(checkout)
        self.emit("ORDER_CREATED", order.__dict__)
        return order

    def payment_confirmed(self, order, reference):
        self.orders.mark_paid(order, reference)
        self.emit(
            "PAYMENT_CONFIRMED",
            {"order_id": order.order_id, "amount": order.subtotal},
        )
        return order

    def shipped(self, order, tracking):
        self.orders.mark_shipped(order, tracking)
        self.emit(
            "SHIPMENT_CREATED",
            {"order_id": order.order_id, "tracking_id": tracking},
        )
        return order

    def delivered(self, order):
        self.orders.mark_delivered(order)
        self.emit("ORDER_DELIVERED", {"order_id": order.order_id})
        return order
