from dataclasses import dataclass, field


@dataclass
class Order:
    order_id: str
    customer_id: str
    country: str
    lines: list
    subtotal: float
    status: str = "PAYMENT_PENDING"
    payment_status: str = "PENDING"
    fulfillment_status: str = "PENDING"
    shipping_status: str = "PENDING"
    metadata: dict = field(default_factory=dict)


class OrderPipeline:
    def create(self, checkout):
        return Order(
            checkout["order_id"],
            checkout["customer_id"],
            checkout["country"],
            checkout["lines"],
            checkout["subtotal"],
        )

    def mark_paid(self, order, reference):
        order.status = "PAID"
        order.payment_status = "PAID"
        order.fulfillment_status = "READY"
        order.metadata["payment_reference"] = reference
        return order

    def start_fulfillment(self, order):
        if order.status != "PAID":
            raise RuntimeError("ORDER_NOT_PAID")
        order.status = "FULFILLING"
        order.fulfillment_status = "IN_PROGRESS"
        return order

    def mark_shipped(self, order, tracking):
        if order.status != "FULFILLING":
            raise RuntimeError("ORDER_NOT_IN_FULFILLMENT")
        order.status = "SHIPPED"
        order.shipping_status = "SHIPPED"
        order.metadata["tracking_id"] = tracking
        return order

    def mark_delivered(self, order):
        if order.status != "SHIPPED":
            raise RuntimeError("ORDER_NOT_SHIPPED")
        order.status = "DELIVERED"
        order.shipping_status = "DELIVERED"
        return order
