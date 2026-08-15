from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class CartItem:
    product_id: str
    sku: str
    quantity: int
    unit_price: Decimal
    currency: str = "EUR"


@dataclass
class Cart:
    cart_id: str
    customer_id: str | None = None
    items: list[CartItem] = field(default_factory=list)

    def subtotal(self):
        return sum((item.unit_price * item.quantity for item in self.items), Decimal("0"))

    def add(self, item):
        if item.quantity < 1:
            raise ValueError("INVALID_QUANTITY")
        self.items.append(item)
