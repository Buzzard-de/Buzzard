class CRMNotificationService:
    def __init__(self, sender=None):
        self.sender = sender

    def send(self, customer_id, subject, message):
        if self.sender is None:
            return {"status": "NOT_CONFIGURED", "customer_id": customer_id}
        return self.sender.send(subject, message)
