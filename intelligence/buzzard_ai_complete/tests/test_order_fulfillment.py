from buzzard_ai_complete.order_engine.engine import OrderFulfillmentEngine
from buzzard_ai_complete.order_engine.fulfillment import FulfillmentGateway
from buzzard_ai_complete.order_engine.models import Order, OrderItem
from buzzard_ai_complete.order_engine.payments import PaymentGateway
from buzzard_ai_complete.order_engine.returns import ReturnEngine
from buzzard_ai_complete.order_engine.state_machine import can_transition
from buzzard_ai_complete.order_engine.stock import InventoryGateway
from buzzard_ai_complete.order_engine.suppliers import SupplierGateway


def make_engine():
    return OrderFulfillmentEngine(
        inventory=InventoryGateway({"SKU1": 10}),
        suppliers=SupplierGateway(
            {"SUP1": {"stock": {"SKU1": 10}, "countries": ["DE"], "priority": 1}}
        ),
        payments=PaymentGateway(configured=True),
        fulfillment=FulfillmentGateway(configured=True),
    )


def test_full_order_flow_to_fulfillment_pending():
    o = Order("O1", "C1", "DE", "35075", [OrderItem("SKU1", 2, 10)])
    r = make_engine().process(o)
    assert r.status == "FULFILLMENT_PENDING"
    assert r.supplier == "SUP1"
    assert o.status == "FULFILLMENT_PENDING"


def test_backorder():
    o = Order("O2", "C1", "DE", "35075", [OrderItem("SKU1", 20, 10)])
    r = make_engine().process(o)
    assert r.status == "BACKORDERED"


def test_no_fake_payment():
    o = Order("O3", "C1", "DE", "35075", [OrderItem("SKU1", 1, 10)])
    r = OrderFulfillmentEngine(inventory=InventoryGateway({"SKU1": 2})).process(o)
    assert r.status == "PAYMENT_PENDING"


def test_state_machine():
    assert can_transition("PAID", "STOCK_RESERVED")
    assert not can_transition("DELIVERED", "PAID")


def test_return():
    o = Order("O4", "C1", "DE", "35075", [OrderItem("SKU1", 1, 10)], status="DELIVERED")
    r = ReturnEngine().request(o, "defective")
    assert r["status"] == "RETURN_REQUESTED"
