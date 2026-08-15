class ConstructionMarketSignals:
    def score(self, demand, competition, margin, supply, seasonality, risk):
        score = demand * 0.25 + margin * 0.25 + competition * 0.20 + supply * 0.15 + seasonality * 0.15 - risk * 0.10
        return max(0.0, min(100.0, score))

    def priority(self, score):
        return "high" if score >= 80 else "medium" if score >= 60 else "watch"


class ConstructionMarketIntelligence(ConstructionMarketSignals):
    def score(self, demand, margin, competition_gap, supply_stability, seasonality, risk):
        return super().score(
            demand,
            competition_gap,
            margin,
            supply_stability,
            seasonality,
            risk,
        )
