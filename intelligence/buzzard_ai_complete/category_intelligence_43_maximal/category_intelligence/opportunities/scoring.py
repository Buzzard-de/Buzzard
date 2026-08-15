class OpportunityScorer:
    def score(self, competitor_count, seller_count, price_signal,
              demand_signal=0.0, margin_signal=0.0, evidence_quality=0.0,
              compliance_risk=0.0, supply_risk=0.0):
        raw = (
            competitor_count * 0.10 +
            seller_count * 0.10 +
            price_signal * 0.15 +
            demand_signal * 0.20 +
            margin_signal * 0.20 +
            evidence_quality * 0.15 -
            compliance_risk * 0.05 -
            supply_risk * 0.05
        )
        return max(0.0, min(100.0, raw))

    def classify(self, score):
        if score >= 80:
            return "high_priority"
        if score >= 60:
            return "medium_priority"
        return "watch"
