from buzzard_ai_complete.order_engine.engine import OrderFulfillmentEngine
from buzzard_ai_complete.order_engine.fulfillment import FulfillmentGateway
from buzzard_ai_complete.order_engine.models import Order, OrderItem
from buzzard_ai_complete.order_engine.payments import PaymentGateway
from buzzard_ai_complete.order_engine.stock import InventoryGateway
from buzzard_ai_complete.order_engine.suppliers import SupplierGateway


class OrderFulfillmentService:
    def __init__(self, engine=None):
        self.engine = engine or OrderFulfillmentEngine(
            inventory=InventoryGateway({"SKU-DEMO": 10}),
            suppliers=SupplierGateway(
                {"SUP1": {"stock": {"SKU-DEMO": 10}, "countries": ["DE"], "priority": 1}}
            ),
            payments=PaymentGateway(configured=True),
            fulfillment=FulfillmentGateway(configured=True),
        )

    def process_order(self, order_id, customer_id, country, postal_code, sku, quantity, unit_price):
        order = Order(
            order_id,
            customer_id,
            country,
            postal_code,
            [OrderItem(sku, int(quantity), float(unit_price))],
        )
        return self.engine.process(order)
