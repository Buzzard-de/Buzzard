class CustomerJourneyEngineV2:
    def __init__(self):
        self.journeys = {}

    def enroll(self, customer_id, journey):
        self.journeys[customer_id] = {"journey": journey, "step": 0, "status": "ACTIVE"}
        return self.journeys[customer_id]

    def advance(self, customer_id):
        item = self.journeys.get(customer_id)
        if item is None:
            return {"status": "NOT_FOUND"}
        item["step"] += 1
        return item
