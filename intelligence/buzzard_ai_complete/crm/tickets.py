from buzzard_ai_complete.crm.models import Ticket


class TicketEngine:
    def __init__(self):
        self.tickets = {}

    def create(self, ticket: Ticket):
        if not ticket.ticket_id or not ticket.customer_id or not ticket.message:
            raise ValueError("ticket_required_fields_missing")
        self.tickets[ticket.ticket_id] = ticket
        return ticket

    def update_status(self, ticket_id, status):
        if ticket_id not in self.tickets:
            raise KeyError("ticket_not_found")
        if status not in {"OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"}:
            raise ValueError("invalid_ticket_status")
        self.tickets[ticket_id].status = status
        return self.tickets[ticket_id]

    def get(self, ticket_id):
        return self.tickets.get(ticket_id)
