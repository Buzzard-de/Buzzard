class BudgetEngine:
    def validate(self, budget):
        if budget < 0:
            raise ValueError("budget_must_not_be_negative")
        return round(float(budget), 2)

    def allocate(self, total, channels, weights=None):
        total = self.validate(total)
        if not channels:
            return {}
        if weights is None:
            weights = {c: 1 for c in channels}
        weight_sum = sum(weights.get(c, 0) for c in channels)
        if weight_sum <= 0:
            raise ValueError("invalid_weights")
        return {c: round(total * weights.get(c, 0) / weight_sum, 2) for c in channels}
