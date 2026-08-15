class CustomerEventStore:
    def __init__(self):
        self.events = []

    def add(self, event):
        self.events.append(event)
        return event

    def for_customer(self, customer_id):
        return [e for e in self.events if e.customer_id == customer_id]
