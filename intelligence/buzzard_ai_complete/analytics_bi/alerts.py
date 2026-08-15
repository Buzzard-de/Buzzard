from buzzard_ai_complete.analytics_bi.models import Alert


class AlertEngine:
    def low_margin(self, margin, threshold=0.05):
        if margin < threshold:
            return Alert("LOW_MARGIN", "HIGH", "Product margin below threshold", margin)
        return None

    def high_return_rate(self, rate, threshold=0.10):
        if rate > threshold:
            return Alert("HIGH_RETURN_RATE", "MEDIUM", "Return rate above threshold", rate)
        return None
