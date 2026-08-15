from buzzard_ai_complete.ai_council_18_unified.council.agents.base import CouncilAgent


class CustomsBureaucracyAi(CouncilAgent):
    agent_id = "customs_bureaucracy_ai"
    name = "Customs & Bureaucracy AI"
    input_topics = "country,logistics,profit,supply,compliance,manufacturer,product,marketplace,customs".split(",")

    def analyze(self, objective, context, prior_findings):
        return self.finding(
            "customs_bureaucracy",
            (
                f"Customs and bureaucracy screening for: {objective}. "
                "Prior country, logistics, profit, supply and compliance findings were supplied as shared context."
            ),
            0.85,
            recommendations=[
                "verify HS/CN/TARIC classification from official tariff sources",
                "verify origin and preferential-origin conditions",
                "check import restrictions, licenses and certificates",
                "calculate landed cost only after verified duty/tax inputs",
                "maintain documentary evidence and timestamps",
            ],
            risks=[
                "classification_may_require_binding_or_professional_review",
                "country_rules_and_tariff_measures_can_change",
                "special_product_controls_may_apply",
            ],
            approval=True,
        )
