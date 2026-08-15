from buzzard_ai_complete.order_engine.fulfillment import FulfillmentGateway
from buzzard_ai_complete.order_engine.models import FulfillmentResult, Order
from buzzard_ai_complete.order_engine.payments import PaymentGateway
from buzzard_ai_complete.order_engine.state_machine import transition
from buzzard_ai_complete.order_engine.stock import InventoryGateway
from buzzard_ai_complete.order_engine.suppliers import SupplierGateway


class OrderFulfillmentEngine:
    def __init__(self, inventory=None, suppliers=None, payments=None, fulfillment=None, logistics=None):
        self.inventory = inventory or InventoryGateway()
        self.suppliers = suppliers or SupplierGateway()
        self.payments = payments or PaymentGateway()
        self.fulfillment = fulfillment or FulfillmentGateway()
        self.logistics = logistics

    def validate(self, order):
        errors = []
        if not order.order_id:
            errors.append("missing_order_id")
        if not order.customer_id:
            errors.append("missing_customer_id")
        if not order.items:
            errors.append("empty_order")
        for i in order.items:
            if i.quantity <= 0:
                errors.append(f"invalid_quantity:{i.sku}")
            if i.unit_price < 0:
                errors.append(f"invalid_price:{i.sku}")
        return errors

    def process(self, order):
        errors = self.validate(order)
        if errors:
            return FulfillmentResult(order.order_id, "REJECTED", errors=errors)

        payment = self.payments.authorize(order)
        if payment["status"] != "AUTHORIZED":
            return FulfillmentResult(
                order.order_id, "PAYMENT_PENDING", errors=["payment_not_configured_or_failed"]
            )

        transition(order, "PAYMENT_PENDING")
        transition(order, "PAID")

        for item in order.items:
            if not self.inventory.reserve(item.sku, item.quantity):
                order.status = "BACKORDERED"
                return FulfillmentResult(
                    order.order_id, "BACKORDERED", errors=[f"stock_unavailable:{item.sku}"]
                )

        transition(order, "STOCK_RESERVED")
        supplier = self.suppliers.select(order.items, order.country)
        if not supplier:
            order.status = "FULFILLMENT_FAILED"
            return FulfillmentResult(order.order_id, "FULFILLMENT_FAILED", errors=["no_supplier_available"])

        transition(order, "FULFILLMENT_PENDING")
        submitted = self.fulfillment.submit(order, supplier)
        if submitted["status"] != "SUBMITTED":
            return FulfillmentResult(
                order.order_id,
                "FULFILLMENT_PENDING",
                supplier=supplier,
                errors=["fulfillment_provider_not_configured"],
            )

        return FulfillmentResult(order.order_id, "FULFILLMENT_PENDING", supplier=supplier)
