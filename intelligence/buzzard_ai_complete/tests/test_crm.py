from buzzard_ai_complete.crm.engine import CRMEngine
from buzzard_ai_complete.crm.models import CustomerEvent, Review, Ticket


def test_customer_segmentation():
    crm = CRMEngine()
    assert crm.segment(1200, 6) == "VIP"
    assert crm.segment(400, 3) == "LOYAL"
    assert crm.segment(50, 1, 3) == "AT_RISK"


def test_ticket_lifecycle():
    crm = CRMEngine()
    t = crm.tickets.create(Ticket("T1", "C1", "Question", "Help please"))
    assert t.status == "OPEN"
    assert crm.tickets.update_status("T1", "RESOLVED").status == "RESOLVED"


def test_events_and_loyalty():
    crm = CRMEngine()
    crm.events.add(CustomerEvent("C1", "ORDER_COMPLETED", 100))
    crm.loyalty.add("C1", 50)
    snap = crm.customer_snapshot("C1")
    assert snap["events"] == 1
    assert snap["loyalty_points"] == 50


def test_reviews():
    crm = CRMEngine()
    crm.reviews.add(Review("C1", "O1", 5))
    crm.reviews.add(Review("C1", "O2", 4))
    assert crm.reviews.average("C1") == 4.5


def test_abandoned_cart():
    crm = CRMEngine()
    crm.carts.save("C1", {"SKU1": 2})
    assert crm.carts.recoverable("C1") is True


def test_no_fake_notifications():
    assert CRMEngine().notifications.send("C1", "Hi", "Hello")["status"] == "NOT_CONFIGURED"
