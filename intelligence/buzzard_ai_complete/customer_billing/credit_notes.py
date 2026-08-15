from buzzard_ai_complete.customer_billing.models import CreditNote


class CreditNoteEngine:
    def create(self, credit_note_id, invoice_id, reason, amount_net, amount_vat):
        if amount_net < 0 or amount_vat < 0:
            raise ValueError("credit_amount_must_not_be_negative")
        return CreditNote(
            credit_note_id,
            invoice_id,
            reason,
            round(amount_net, 2),
            round(amount_vat, 2),
        )
