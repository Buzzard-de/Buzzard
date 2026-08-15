class MarketingEngine:
    def __init__(self, channels): self.channels=channels
    def campaign_score(self, spend, revenue, orders):
        spend=float(spend); revenue=float(revenue)
        return {"roas":revenue/spend if spend else 0.0,"orders":orders,"revenue":revenue}
    def allocate(self, total_budget, channel_scores):
        total=max(sum(max(0,float(x.get("roas",0))) for x in channel_scores.values()),1)
        return {c:float(total_budget)*max(0,float(v.get("roas",0)))/total for c,v in channel_scores.items()}
