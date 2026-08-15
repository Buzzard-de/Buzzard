from buzzard_ai_complete.customer_billing.models import Invoice, InvoiceLine
from buzzard_ai_complete.customer_billing.vat import calculate_vat


class InvoiceEngine:
    def create(self, invoice_id, order_id, customer_id, lines, currency="EUR"):
        normalized = []
        for line in lines:
            if line["quantity"] <= 0:
                raise ValueError("invalid_quantity")
            if line["net_unit_price"] < 0:
                raise ValueError("invalid_price")
            normalized.append(InvoiceLine(**line))
        return Invoice(invoice_id, order_id, customer_id, currency, normalized)

    def totals(self, invoice):
        net = 0.0
        vat = 0.0
        for line in invoice.lines:
            line_net = round(line.quantity * line.net_unit_price, 2)
            net += line_net
            vat += calculate_vat(line_net, line.vat_rate).vat
        return {"net": round(net, 2), "vat": round(vat, 2), "gross": round(net + vat, 2)}
