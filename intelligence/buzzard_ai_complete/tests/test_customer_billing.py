from buzzard_ai_complete.customer_billing.credit_notes import CreditNoteEngine
from buzzard_ai_complete.customer_billing.customer import CustomerRegistry
from buzzard_ai_complete.customer_billing.engine import CustomerBillingEngine
from buzzard_ai_complete.customer_billing.invoice import InvoiceEngine
from buzzard_ai_complete.customer_billing.models import Customer
from buzzard_ai_complete.customer_billing.reconciliation import ReconciliationEngine
from buzzard_ai_complete.customer_billing.refunds import RefundEngine


def test_invoice_vat_totals():
    inv = InvoiceEngine().create(
        "INV1",
        "O1",
        "C1",
        [{"sku": "S1", "description": "Test", "quantity": 2, "net_unit_price": 10, "vat_rate": 19}],
    )
    assert InvoiceEngine().totals(inv) == {"net": 20.0, "vat": 3.8, "gross": 23.8}


def test_payment_status():
    e = CustomerBillingEngine()
    e.payments.record("O1", 23.80, "PAID")
    assert e.payment_status("O1", 23.80)["status"] == "PAID"
    assert e.payment_status("O1", 23.80)["outstanding"] == 0


def test_refund_validation():
    r = RefundEngine().request("O1", "defective", 10)
    assert r["status"] == "REFUND_REQUESTED"
    assert RefundEngine().request("O1", "unknown", 10)["status"] == "REJECTED"


def test_credit_note():
    c = CreditNoteEngine().create("CN1", "INV1", "defective", 10, 1.9)
    assert c.amount_net == 10


def test_customer_registry():
    reg = CustomerRegistry()
    c = Customer("C1", "test@example.com")
    reg.upsert(c)
    assert reg.get("C1").email == "test@example.com"


def test_reconciliation():
    assert ReconciliationEngine().reconcile(100, 100)["matched"] is True
    assert ReconciliationEngine().reconcile(100, 99)["matched"] is False


def test_no_negative_credit():
    try:
        CreditNoteEngine().create("CN2", "INV1", "x", -1, 0)
        assert False
    except ValueError:
        assert True
