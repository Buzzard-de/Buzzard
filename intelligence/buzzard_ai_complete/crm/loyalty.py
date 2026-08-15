class LoyaltyEngine:
    def __init__(self):
        self.points = {}

    def add(self, customer_id, points):
        if points < 0:
            raise ValueError("points_must_not_be_negative")
        self.points[customer_id] = self.points.get(customer_id, 0) + int(points)
        return self.points[customer_id]

    def balance(self, customer_id):
        return self.points.get(customer_id, 0)
