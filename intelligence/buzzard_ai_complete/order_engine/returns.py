class ReturnEngine:
    ALLOWED_REASONS = {"defective", "wrong_item", "customer_change_of_mind", "damaged"}

    def request(self, order, reason):
        if reason not in self.ALLOWED_REASONS:
            return {"status": "REJECTED", "reason": "unsupported_reason"}
        if order.status not in {"SHIPPED", "DELIVERED", "COMPLETED"}:
            return {"status": "REJECTED", "reason": "order_not_returnable_in_current_state"}
        order.status = "RETURN_REQUESTED"
        return {"status": "RETURN_REQUESTED", "order_id": order.order_id}
