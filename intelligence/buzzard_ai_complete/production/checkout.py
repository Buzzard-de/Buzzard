from dataclasses import dataclass, field
from uuid import uuid4


@dataclass
class CartItem:
    sku: str
    quantity: int


@dataclass
class Cart:
    cart_id: str = field(default_factory=lambda: str(uuid4()))
    items: list = field(default_factory=list)


class CheckoutEngine:
    def __init__(self, catalog, pricing_guard):
        self.catalog = catalog
        self.pricing = pricing_guard
        self.carts = {}

    def create_cart(self):
        cart = Cart()
        self.carts[cart.cart_id] = cart
        return cart

    def add(self, cart_id, sku, quantity):
        if quantity <= 0:
            raise ValueError("quantity_must_be_positive")
        product = self.catalog.get(sku)
        if not product or not product.active:
            raise KeyError("product_not_available")
        current = sum(item.quantity for item in self.carts[cart_id].items if item.sku == sku)
        if current + quantity > product.stock:
            raise ValueError("insufficient_stock")
        self.carts[cart_id].items.append(CartItem(sku, quantity))
        return self.carts[cart_id]

    def quote(self, cart_id):
        cart = self.carts[cart_id]
        lines = []
        total = 0.0
        for item in cart.items:
            product = self.catalog.get(item.sku)
            if not product:
                raise KeyError("product_not_available")
            amount = round(product.price * item.quantity, 2)
            total += amount
            lines.append(
                {
                    "sku": item.sku,
                    "quantity": item.quantity,
                    "unit_price": product.price,
                    "total": amount,
                }
            )
        return {"cart_id": cart_id, "lines": lines, "subtotal": round(total, 2), "currency": "EUR"}

    def checkout(self, cart_id, customer_id, country):
        quote = self.quote(cart_id)
        if not quote["lines"]:
            raise ValueError("empty_cart")
        return {
            "status": "PAYMENT_REQUIRED",
            "order_id": f"ORD-{uuid4().hex[:12].upper()}",
            "customer_id": customer_id,
            "country": country,
            **quote,
        }
