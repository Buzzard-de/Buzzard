class DecisionEngine:
    def decide(self, signals):
        if signals.get("security_block"):
            return "BLOCK"
        if signals.get("compliance_block"):
            return "REVIEW"
        if signals.get("profitable") and signals.get("stock_available"):
            return "PROCEED"
        return "REVIEW"
