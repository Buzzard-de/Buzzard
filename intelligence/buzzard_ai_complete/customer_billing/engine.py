from buzzard_ai_complete.customer_billing.credit_notes import CreditNoteEngine
from buzzard_ai_complete.customer_billing.customer import CustomerRegistry
from buzzard_ai_complete.customer_billing.invoice import InvoiceEngine
from buzzard_ai_complete.customer_billing.payments import PaymentLedger
from buzzard_ai_complete.customer_billing.reconciliation import ReconciliationEngine
from buzzard_ai_complete.customer_billing.refunds import RefundEngine


class CustomerBillingEngine:
    def __init__(self):
        self.customers = CustomerRegistry()
        self.invoices = InvoiceEngine()
        self.payments = PaymentLedger()
        self.refunds = RefundEngine()
        self.credit_notes = CreditNoteEngine()
        self.reconciliation = ReconciliationEngine()

    def invoice_totals(self, invoice):
        return self.invoices.totals(invoice)

    def payment_status(self, order_id, gross_total):
        paid = self.payments.paid_total(order_id)
        refunded = self.payments.refunded_total(order_id)
        return {
            "paid": paid,
            "refunded": refunded,
            "outstanding": round(max(0, gross_total - paid + refunded), 2),
            "status": "PAID"
            if paid - refunded >= gross_total
            else "PARTIALLY_PAID"
            if paid
            else "UNPAID",
        }
