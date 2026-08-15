class CustomsRiskEngine:
    HIGH_RISK_KEYWORDS = {"chemical", "battery", "food", "medicine", "weapon", "plant", "animal"}

    def assess(self, profile, route):
        text = (profile.description or "").lower()
        hits = [keyword for keyword in self.HIGH_RISK_KEYWORDS if keyword in text]
        risks = []
        if hits:
            risks.append("special_product_controls_possible")
        if not (profile.hs_code or profile.cn_code or profile.taric_code):
            risks.append("tariff_classification_missing")
        if not profile.origin_country:
            risks.append("origin_missing")
        if route.origin != route.destination and not profile.evidence:
            risks.append("evidence_missing")
        return {"risks": risks, "human_review_required": bool(risks), "keywords": hits}
