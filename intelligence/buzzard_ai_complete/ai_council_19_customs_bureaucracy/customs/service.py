from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.alerts.risk import CustomsRiskEngine
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.documents.checklist import CustomsDocumentChecklist
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.models import CustomsAssessment
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.rules.engine import CustomsRulesEngine
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.rules.sources import OriginSource, RestrictionSource


class CustomsBureaucracyEngine:
    def __init__(self):
        self.rules = CustomsRulesEngine(RestrictionSource(), OriginSource())
        self.docs = CustomsDocumentChecklist()
        self.risk = CustomsRiskEngine()

    def assess(self, route, profile):
        classification = self.rules.classify(profile)
        restriction = self.rules.restrictions(profile, route.destination)
        origin = self.rules.origin(profile, route.destination)
        risk = self.risk.assess(profile, route)
        documents = self.docs.required(route, profile)
        risks = list(risk["risks"])
        if restriction.get("restricted"):
            risks.append("destination_restriction")
        if classification["status"] != "verified":
            risks.append("classification_not_verified")
        human = bool(risks or restriction.get("human_review_required"))
        return CustomsAssessment(
            status="review_required" if human else "precheck_pass",
            product_id=profile.product_id,
            route=route,
            tariff_code=classification["code"],
            duties_estimate=None,
            import_tax_estimate=None,
            documents=documents,
            risks=sorted(set(risks)),
            evidence=profile.evidence,
            human_review_required=human,
            notes={
                "classification": classification["status"],
                "restriction": restriction.get("status", "unknown"),
                "origin": origin.get("status", "unknown"),
            },
        )
