class MarketingDecisionRulesV2:
    def __init__(self, min_roas=1.5, scale_roas=3.0):
        self.min_roas = min_roas
        self.scale_roas = scale_roas

    def decide(self, roas):
        if roas < self.min_roas:
            return "PAUSE_OR_REVIEW"
        if roas >= self.scale_roas:
            return "SCALE"
        return "OPTIMIZE"
