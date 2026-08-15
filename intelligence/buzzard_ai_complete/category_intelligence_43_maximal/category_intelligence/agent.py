from datetime import datetime, timezone
from .models import CategoryReport, CategoryOpportunity
from .pricing.engine import PriceIntelligenceEngine
from .taxonomy.engine import TaxonomyIntelligence
from .opportunities.scoring import OpportunityScorer

class CategoryIntelligenceAgent:
    """
    One specialized intelligence agent per Buzzard main category.
    Agents are independent in specialization but share the same intelligence
    protocol, evidence store, event bus and council memory.
    """
    def __init__(self, category_id, category_name, shared_memory=None, event_bus=None):
        self.category_id = category_id
        self.category_name = category_name
        self.shared_memory = shared_memory
        self.event_bus = event_bus
        self.pricing = PriceIntelligenceEngine()
        self.taxonomy = TaxonomyIntelligence()
        self.scorer = OpportunityScorer()

    def analyze(self, offers, buzzard_taxonomy, observed_taxonomy, period="current"):
        price_stats = self.pricing.summarize(offers)
        price_changes = []
        gaps = self.taxonomy.hierarchy_gaps(buzzard_taxonomy, observed_taxonomy)

        opportunities = []
        for gap in gaps:
            score = self.scorer.score(
                competitor_count=max(price_stats.get("count", 0), 1),
                seller_count=max(price_stats.get("unique_sellers", 0), 1),
                price_signal=50,
                demand_signal=50,
                margin_signal=50,
                evidence_quality=70,
                compliance_risk=0,
                supply_risk=0
            )
            opportunities.append(CategoryOpportunity(
                opportunity_id=f"{self.category_id}:{gap['level']}:{gap['name']}",
                category_id=self.category_id,
                opportunity_type="missing_taxonomy_node",
                name=gap["name"],
                evidence_count=1,
                confidence=round(score/100, 3),
                reasons=["observed in public-source competitor taxonomy"],
                competitor_examples=[gap.get("source","unknown")]
            ))

        report = CategoryReport(
            category_id=self.category_id,
            period=period,
            offers_seen=price_stats.get("count", 0),
            unique_sellers=price_stats.get("unique_sellers", 0),
            price_statistics=price_stats,
            missing_categories=[x for x in opportunities if x.opportunity_id.split(":")[1] != "3"],
            missing_products=[],
            changes=price_changes,
            risks=[],
            evidence=[]
        )

        if self.shared_memory is not None:
            self.shared_memory.add_finding({
                "agent_id": f"category_intelligence:{self.category_id}",
                "topic": self.category_name,
                "finding": report,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
        if self.event_bus is not None:
            self.event_bus.publish("category.report", report)
        return report
