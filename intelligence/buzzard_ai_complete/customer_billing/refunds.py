class RefundEngine:
    ALLOWED = {"customer_change_of_mind", "defective", "wrong_item", "damaged", "cancelled"}

    def validate(self, reason, amount):
        if reason not in self.ALLOWED:
            return False, "unsupported_reason"
        if amount <= 0:
            return False, "invalid_amount"
        return True, ""

    def request(self, order_id, reason, amount):
        ok, error = self.validate(reason, amount)
        if not ok:
            return {"status": "REJECTED", "order_id": order_id, "error": error}
        return {
            "status": "REFUND_REQUESTED",
            "order_id": order_id,
            "reason": reason,
            "amount": round(amount, 2),
        }
