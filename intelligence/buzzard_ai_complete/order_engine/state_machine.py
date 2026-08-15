ALLOWED = {
    "NEW": {"PAYMENT_PENDING", "CANCELLED"},
    "PAYMENT_PENDING": {"PAID", "PAYMENT_FAILED", "CANCELLED"},
    "PAID": {"STOCK_RESERVED", "BACKORDERED", "CANCELLED"},
    "STOCK_RESERVED": {"FULFILLMENT_PENDING", "CANCELLED"},
    "FULFILLMENT_PENDING": {"SHIPPED", "FULFILLMENT_FAILED"},
    "SHIPPED": {"DELIVERED", "RETURN_REQUESTED"},
    "DELIVERED": {"RETURN_REQUESTED", "COMPLETED"},
    "RETURN_REQUESTED": {"RETURNED", "RETURN_REJECTED"},
    "RETURNED": {"REFUNDED"},
    "REFUNDED": {"COMPLETED"},
    "BACKORDERED": {"STOCK_RESERVED", "CANCELLED"},
    "PAYMENT_FAILED": {"CANCELLED", "PAYMENT_PENDING"},
    "FULFILLMENT_FAILED": {"FULFILLMENT_PENDING", "CANCELLED"},
    "RETURN_REJECTED": {"COMPLETED"},
    "COMPLETED": set(),
    "CANCELLED": set(),
}


def can_transition(current, new):
    return new in ALLOWED.get(current, set())


def transition(order, new):
    if not can_transition(order.status, new):
        raise ValueError(f"Invalid order transition: {order.status} -> {new}")
    order.status = new
    return order
