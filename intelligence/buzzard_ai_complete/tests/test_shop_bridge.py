from buzzard_ai_complete.production.catalog import Catalog, Product
from buzzard_ai_complete.production.checkout import CheckoutEngine
from buzzard_ai_complete.production.pricing import PricingGuard
from buzzard_ai_complete.shop_bridge.bridge import ShopIntelligenceBridge
from buzzard_ai_complete.shop_bridge.feature_gate import SalesGate
from buzzard_ai_complete.shop_bridge.metrics_adapter import CommerceAnalyticsAdapter


def setup():
    catalog = Catalog()
    catalog.upsert(Product("S1", "Test", "Test", 50, 10))
    checkout = CheckoutEngine(catalog, PricingGuard())
    return catalog, checkout, ShopIntelligenceBridge(catalog, checkout)


def test_gate_blocks_without_providers():
    _, _, bridge = setup()
    readiness = bridge.readiness()
    assert not readiness["sales_enabled"]
    assert "payment" in readiness["missing"] and "shipping" in readiness["missing"]


def test_gate_allows_when_ready():
    result = SalesGate().evaluate(
        {
            "catalog": "READY",
            "payment": "READY",
            "shipping": "READY",
            "order_pipeline": "READY",
            "intelligence_bridge": "READY",
        }
    )
    assert result["sales_enabled"]


def test_lifecycle():
    _, checkout, bridge = setup()
    cart = checkout.create_cart()
    checkout.add(cart.cart_id, "S1", 1)
    quote = checkout.quote(cart.cart_id)
    order = bridge.orders.create(
        {
            "order_id": "O1",
            "customer_id": "C1",
            "country": "DE",
            "lines": quote["lines"],
            "subtotal": quote["subtotal"],
        }
    )
    bridge.payment_confirmed(order, "P1")
    bridge.orders.start_fulfillment(order)
    bridge.shipped(order, "T1")
    bridge.delivered(order)
    assert order.status == "DELIVERED"


def test_events_to_analytics():
    _, _, bridge = setup()
    bridge.emit("ORDER_CREATED", {"order_id": "O1", "subtotal": 50})
    bridge.emit("PAYMENT_CONFIRMED", {"order_id": "O1", "amount": 50})
    rows = CommerceAnalyticsAdapter().convert(bridge.events.events)
    assert rows[0]["event_type"] == "ORDER" and rows[1]["event_type"] == "SALE"


def test_hooks():
    _, _, bridge = setup()
    bridge.intelligence.analytics = True
    bridge.intelligence.decision = True
    result = bridge.emit("ORDER_CREATED", {"order_id": "O2"})
    assert (
        result["intelligence"]["analytics"] == "ATTACHED"
        and result["intelligence"]["decision"] == "ATTACHED"
    )
