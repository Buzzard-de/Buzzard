from buzzard_ai_complete.crm.clv import calculate_clv
from buzzard_ai_complete.crm.engine import CRMEngine
from buzzard_ai_complete.crm.models import CustomerEvent, Review, Ticket


class CustomerExperienceService:
    def __init__(self, engine=None):
        self.engine = engine or CRMEngine()

    def demo_flow(self):
        crm = self.engine
        segments = {
            "vip": crm.segment(1200, 6),
            "loyal": crm.segment(400, 3),
            "at_risk": crm.segment(50, 1, 3),
        }
        ticket = crm.tickets.create(Ticket("T-DEMO", "C-DEMO", "Question", "Help please"))
        crm.tickets.update_status("T-DEMO", "RESOLVED")
        crm.events.add(CustomerEvent("C-DEMO", "ORDER_COMPLETED", 100))
        crm.loyalty.add("C-DEMO", 50)
        crm.reviews.add(Review("C-DEMO", "O-DEMO-1", 5))
        crm.reviews.add(Review("C-DEMO", "O-DEMO-2", 4))
        crm.carts.save("C-DEMO", {"SKU-DEMO": 2})
        return {
            "segments": segments,
            "ticket_status": ticket.status,
            "snapshot": crm.customer_snapshot("C-DEMO"),
            "clv": calculate_clv(1200, 6, 0.25),
            "notification": crm.notifications.send("C-DEMO", "Hi", "Hello"),
        }

    def segment(self, lifetime_value, order_count, support_tickets=0):
        return {"segment": self.engine.segment(lifetime_value, order_count, support_tickets)}
