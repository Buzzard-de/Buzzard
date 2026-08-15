from buzzard_ai_complete.crm.abandoned_cart import AbandonedCartEngine
from buzzard_ai_complete.crm.events import CustomerEventStore
from buzzard_ai_complete.crm.loyalty import LoyaltyEngine
from buzzard_ai_complete.crm.notifications import CRMNotificationService
from buzzard_ai_complete.crm.reviews import ReviewEngine
from buzzard_ai_complete.crm.segments import segment_customer
from buzzard_ai_complete.crm.tickets import TicketEngine


class CRMEngine:
    def __init__(self):
        self.events = CustomerEventStore()
        self.tickets = TicketEngine()
        self.reviews = ReviewEngine()
        self.loyalty = LoyaltyEngine()
        self.carts = AbandonedCartEngine()
        self.notifications = CRMNotificationService()

    def segment(self, lifetime_value, order_count, support_tickets=0):
        return segment_customer(lifetime_value, order_count, support_tickets)

    def customer_snapshot(self, customer_id):
        return {
            "customer_id": customer_id,
            "events": len(self.events.for_customer(customer_id)),
            "tickets": len(
                [t for t in self.tickets.tickets.values() if t.customer_id == customer_id]
            ),
            "loyalty_points": self.loyalty.balance(customer_id),
            "average_rating": self.reviews.average(customer_id),
            "abandoned_cart": self.carts.recoverable(customer_id),
        }
