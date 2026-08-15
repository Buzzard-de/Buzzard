class TradeCalculator:
    def assess(self, route, profile, duty_rate=None, import_tax_rate=None):
        if duty_rate is None or import_tax_rate is None:
            return {"status": "rate_verification_required", "human_review_required": True}
        from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.calculators.landed_cost import (
            LandedCostCalculator,
        )

        return LandedCostCalculator().calculate(
            profile.customs_value,
            freight=0,
            insurance=0,
            duty_rate=duty_rate,
            import_tax_rate=import_tax_rate,
        )
