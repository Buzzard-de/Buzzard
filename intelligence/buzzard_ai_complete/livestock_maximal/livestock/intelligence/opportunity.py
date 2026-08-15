class LivestockOpportunity:
    def score(self, demand, competition_gap, margin, supply, seasonal, risk):
        score=(demand*.25+competition_gap*.20+margin*.25+supply*.15+seasonal*.15-risk*.10)
        return max(0,min(100,score))
    def priority(self, score):
        return "high" if score>=80 else "medium" if score>=60 else "watch"
