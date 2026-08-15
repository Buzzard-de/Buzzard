import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.ai_council_18_unified.council.contracts import CouncilCase
from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import SharedIntelligenceMemory
from buzzard_ai_complete.ai_council_18_unified.council.orchestration.orchestrator import CouncilOrchestrator
from buzzard_ai_complete.ai_council_18_unified.council.policy.guardrails import CouncilGuardrails
from buzzard_ai_complete.ai_council_18_unified.council.registry import AGENT_CLASSES, build_registry

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class AiCouncil18Service:
    def load_config(self):
        return json.loads((CONFIG_DIR / "council_agents.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "council_finding.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        return {
            "service": "ai-council-18-unified",
            "status": "unified_council_ready",
            "agents": len(AGENT_CLASSES),
            "shared_memory": config.get("shared_memory", True),
            "event_bus": config.get("event_bus", True),
            "evidence_required": config.get("evidence_required", True),
            "human_approval_gates": config.get("human_approval", {}),
            "existing_specialists": config.get("existing_specialists", []),
            "live_activation": False,
        }

    def list_agents(self):
        router = build_registry()
        return [
            {
                "agent_id": agent.agent_id,
                "name": agent.name,
                "input_topics": agent.input_topics,
            }
            for agent in router.all()
        ]

    def _orchestrator(self):
        memory = SharedIntelligenceMemory()
        router = build_registry(memory)
        return CouncilOrchestrator(router, memory, CouncilGuardrails()), memory, router

    def run_case(self, objective="Evaluate a new product opportunity", case_id="case-demo"):
        orch, memory, router = self._orchestrator()
        case = CouncilCase(case_id, objective)
        agent_ids = [agent.agent_id for agent in router.all()]
        result = orch.run_case(case, agent_ids)
        consensus = orch.consensus(result)
        return {
            "case_id": result.case_id,
            "objective": result.objective,
            "findings_count": len(result.findings),
            "memory_findings": len(memory.findings),
            "consensus": consensus,
            "findings": [asdict(finding) for finding in result.findings],
        }

    def demo_flow(self):
        case_result = self.run_case()
        memory = SharedIntelligenceMemory()
        router = build_registry(memory)
        market = router.get("market_intelligence_ai")
        finding = market.analyze("Test market", {}, memory.context(market.input_topics))
        memory.add_finding(finding)
        chief = router.get("chief_strategy_ai")
        context = memory.context(chief.input_topics)
        return {
            "health": self.health(),
            "agents": self.list_agents(),
            "case": case_result,
            "inter_agent_context_sample": {
                "market_finding": asdict(finding),
                "chief_context_topics": list(context.keys()),
                "chief_context_has_data": any(context.values()),
            },
        }
