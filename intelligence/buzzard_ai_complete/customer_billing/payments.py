class PaymentLedger:
    def __init__(self):
        self.transactions = []

    def record(self, order_id, amount, status, reference=""):
        if amount < 0:
            raise ValueError("amount_must_not_be_negative")
        tx = {
            "order_id": order_id,
            "amount": round(amount, 2),
            "status": status,
            "reference": reference,
        }
        self.transactions.append(tx)
        return tx

    def paid_total(self, order_id):
        return round(
            sum(
                t["amount"]
                for t in self.transactions
                if t["order_id"] == order_id and t["status"] == "PAID"
            ),
            2,
        )

    def refunded_total(self, order_id):
        return round(
            sum(
                t["amount"]
                for t in self.transactions
                if t["order_id"] == order_id and t["status"] == "REFUNDED"
            ),
            2,
        )

    def outstanding(self, order_id, gross_total):
        return round(
            max(0.0, gross_total - self.paid_total(order_id) + self.refunded_total(order_id)),
            2,
        )
