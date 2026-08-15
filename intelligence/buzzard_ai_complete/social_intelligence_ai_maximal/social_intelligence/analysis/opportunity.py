class SocialOpportunityEngine:
    def score(self, cross_platform_strength, trend_strength, catalog_gap,
              demand_support, commercial_fit, risk):
        score=(
            cross_platform_strength*0.20+
            trend_strength*0.20+
            catalog_gap*0.20+
            demand_support*0.20+
            commercial_fit*0.20-
            risk*0.10
        )
        return max(0.0,min(100.0,score))

    def priority(self, score):
        if score>=80: return "high"
        if score>=60: return "medium"
        return "watch"
