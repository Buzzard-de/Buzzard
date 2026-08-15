class AgricultureMarketSignals:
    def score(self, demand, competition, price_signal, margin, supply_risk):
        score=demand*0.30 + price_signal*0.20 + margin*0.30 + competition*0.20 - supply_risk*0.10
        return max(0.0,min(100.0,score))

    def priority(self, score):
        if score>=80: return "high"
        if score>=60: return "medium"
        return "watch"
