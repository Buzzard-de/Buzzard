from buzzard_ai_complete.customer_billing.engine import CustomerBillingEngine
from buzzard_ai_complete.customer_billing.models import Customer


class CustomerBillingService:
    def __init__(self, engine=None):
        self.engine = engine or CustomerBillingEngine()

    def demo_flow(self):
        self.engine.customers.upsert(Customer("C-DEMO", "demo@example.com", country="DE"))
        invoice = self.engine.invoices.create(
            "INV-DEMO",
            "O-DEMO",
            "C-DEMO",
            [
                {
                    "sku": "SKU-DEMO",
                    "description": "Demo product",
                    "quantity": 2,
                    "net_unit_price": 10,
                    "vat_rate": 19,
                }
            ],
        )
        totals = self.engine.invoice_totals(invoice)
        self.engine.payments.record("O-DEMO", totals["gross"], "PAID")
        payment_status = self.engine.payment_status("O-DEMO", totals["gross"])
        refund = self.engine.refunds.request("O-DEMO", "defective", 5.0)
        credit_note = self.engine.credit_notes.create("CN-DEMO", "INV-DEMO", "defective", 4.2, 0.8)
        reconciliation = self.engine.reconciliation.reconcile(totals["gross"], totals["gross"])
        return {
            "invoice_totals": totals,
            "payment_status": payment_status,
            "refund": refund,
            "credit_note": {
                "credit_note_id": credit_note.credit_note_id,
                "amount_net": credit_note.amount_net,
                "amount_vat": credit_note.amount_vat,
            },
            "reconciliation": reconciliation,
        }

    def refund(self, order_id, reason, amount):
        return self.engine.refunds.request(order_id, reason, amount)

    def payment_status(self, order_id, gross_total):
        return self.engine.payment_status(order_id, gross_total)
