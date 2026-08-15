import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.agent import (
    CategoryIntelligenceAgent,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.models import (
    CategoryNode,
    SellerOffer,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.orchestration.event_bus import (
    CategoryEventBus,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.registry import (
    build_43_agents,
)
from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import SharedIntelligenceMemory

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class CategoryIntelligence43Service:
    def load_config(self):
        return json.loads((CONFIG_DIR / "category_intelligence.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "category_report.schema.json").read_text(encoding="utf-8"))

    def category_definitions(self):
        return self.load_config()["categories"]

    def health(self):
        config = self.load_config()
        monitoring = config.get("monitoring", {})
        outputs = config.get("outputs", {})
        return {
            "service": "category-intelligence-43-maximal",
            "status": "category_intelligence_ready",
            "agents": config.get("agent_count", 43),
            "public_sources_only": monitoring.get("public_sources_only", True),
            "evidence_required": monitoring.get("evidence_required", True),
            "council_bridge": outputs.get("council_bridge", True),
            "live_activation": False,
        }

    def list_agents(self):
        agents = build_43_agents(self.category_definitions())
        return [
            {"category_id": agent.category_id, "category_name": agent.category_name}
            for agent in agents.values()
        ]

    def demo_flow(self):
        memory = SharedIntelligenceMemory()
        event_bus = CategoryEventBus()
        events = []
        event_bus.subscribe("category.report", events.append)
        agents = build_43_agents(self.category_definitions(), shared_memory=memory, event_bus=event_bus)
        sample_agent = agents[self.category_definitions()[0]["category_id"]]
        offers = [
            SellerOffer("s1", "Seller 1", "P1", "Product", 10),
            SellerOffer("s2", "Seller 2", "P1", "Product", 12),
            SellerOffer("s3", "Seller 3", "P2", "Product 2", 20),
        ]
        buzzard_taxonomy = [CategoryNode("a", "Our Category", 1)]
        observed_taxonomy = [
            CategoryNode("a", "Our Category", 1),
            CategoryNode("b", "Competitor Subcategory", 2, "a", "competitor"),
        ]
        report = sample_agent.analyze(offers, buzzard_taxonomy, observed_taxonomy)
        return {
            "health": self.health(),
            "agent_count": len(agents),
            "sample_category": sample_agent.category_id,
            "report": asdict(report),
            "shared_memory_findings": len(memory.findings),
            "event_bus_reports": len(events),
        }

    def analyze_category(self, category_id):
        agents = build_43_agents(self.category_definitions())
        if category_id not in agents:
            raise KeyError(f"CATEGORY_NOT_FOUND:{category_id}")
        agent = agents[category_id]
        offers = [
            SellerOffer("s1", "Seller 1", "P1", "Product", 10),
            SellerOffer("s2", "Seller 2", "P1", "Product", 12),
        ]
        buzzard_taxonomy = [CategoryNode("a", agent.category_name, 1)]
        observed_taxonomy = [
            CategoryNode("a", agent.category_name, 1),
            CategoryNode("b", "Competitor Subcategory", 2, "a", "competitor"),
        ]
        return asdict(agent.analyze(offers, buzzard_taxonomy, observed_taxonomy))
