from buzzard_ai_complete.crm.models import Review


class ReviewEngine:
    def __init__(self):
        self.reviews = []

    def add(self, review: Review):
        if review.rating < 1 or review.rating > 5:
            raise ValueError("rating_must_be_1_to_5")
        self.reviews.append(review)
        return review

    def average(self, customer_id=None):
        data = [
            r.rating for r in self.reviews if customer_id is None or r.customer_id == customer_id
        ]
        return round(sum(data) / len(data), 2) if data else 0.0
