import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.ai_council_18_unified.council.contracts import CouncilCase
from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import SharedIntelligenceMemory
from buzzard_ai_complete.ai_council_18_unified.council.orchestration.orchestrator import CouncilOrchestrator
from buzzard_ai_complete.ai_council_18_unified.council.policy.guardrails import CouncilGuardrails
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.council.registry19 import AGENT_CLASSES, build_registry19
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.calculators.landed_cost import LandedCostCalculator
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.models import ProductTradeProfile, TradeRoute
from buzzard_ai_complete.ai_council_19_customs_bureaucracy.customs.service import CustomsBureaucracyEngine

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class AiCouncil19Service:
    def load_config(self):
        return json.loads((CONFIG_DIR / "customs_bureaucracy.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "customs_assessment.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        return {
            "service": "ai-council-19-customs-bureaucracy",
            "status": "maximal_customs_ai_ready",
            "agents": len(AGENT_CLASSES),
            "new_agent": "customs_bureaucracy_ai",
            "jurisdictions": config.get("jurisdictions", []),
            "official_sources_required": config.get("official_sources_required", True),
            "live_activation": False,
        }

    def list_agents(self):
        router = build_registry19()
        return [
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "input_topics": agent.input_topics,
            }
            for agent in router.all()
        ]

    def assess_trade(self, product_id="demo", description="battery charger", origin="DE", destination="TR"):
        route = TradeRoute(origin, destination)
        profile = ProductTradeProfile(product_id, description, origin_country=origin)
        assessment = CustomsBureaucracyEngine().assess(route, profile)
        landed = LandedCostCalculator().calculate(100, 10, 0, 0.10, 0.19, 5)
        return {
            "assessment": asdict(assessment),
            "landed_cost_demo": landed,
        }

    def run_case(self, objective="Cross-border product launch screening", case_id="customs-case-demo"):
        memory = SharedIntelligenceMemory()
        router = build_registry19(memory)
        orch = CouncilOrchestrator(router, memory, CouncilGuardrails())
        case = CouncilCase(case_id, objective)
        agent_ids = [agent.agent_id for agent in router.all()]
        result = orch.run_case(case, agent_ids)
        consensus = orch.consensus(result)
        return {
            "case_id": result.case_id,
            "objective": result.objective,
            "findings_count": len(result.findings),
            "consensus": consensus,
            "customs_finding": asdict(result.findings[-1]) if result.findings else None,
        }

    def demo_flow(self):
        return {
            "health": self.health(),
            "agents": self.list_agents(),
            "trade_assessment": self.assess_trade(),
            "council_case": self.run_case(),
        }
