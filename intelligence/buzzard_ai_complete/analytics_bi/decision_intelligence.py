class DecisionIntelligence:
    def recommend(self, snapshot):
        kpis = snapshot.get("kpis", {})
        gross_profit_value = kpis.get("gross_profit", {}).get("value", 0)
        roas = kpis.get("ad_roas", {}).get("value", 0)
        return_rate_value = kpis.get("return_rate", {}).get("value", 0)
        if gross_profit_value < 0:
            return "PROTECT_CASH_AND_REVIEW_COSTS"
        if return_rate_value > 0.10:
            return "INVESTIGATE_RETURNS"
        if roas > 3:
            return "SCALE_PROFITABLE_MARKETING"
        return "OPTIMIZE_AND_MONITOR"
