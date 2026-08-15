class CheckoutService:
    def __init__(self, inventory, payment, orders):
        self.inventory = inventory
        self.payment = payment
        self.orders = orders

    def validate(self, cart, country):
        if not cart.items:
            raise ValueError("EMPTY_CART")
        if not country:
            raise ValueError("DESTINATION_REQUIRED")
        for item in cart.items:
            if self.inventory.available(item.product_id) < item.quantity:
                raise ValueError("INSUFFICIENT_STOCK")
        return True

    def authorize(self, cart, country):
        self.validate(cart, country)
        return self.payment.create_payment_intent(cart.subtotal())
