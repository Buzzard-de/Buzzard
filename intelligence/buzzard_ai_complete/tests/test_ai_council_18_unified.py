from buzzard_ai_complete.ai_council_18_unified.council.contracts import CouncilCase
from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import SharedIntelligenceMemory
from buzzard_ai_complete.ai_council_18_unified.council.orchestration.orchestrator import CouncilOrchestrator
from buzzard_ai_complete.ai_council_18_unified.council.policy.guardrails import CouncilGuardrails
from buzzard_ai_complete.ai_council_18_unified.council.registry import AGENT_CLASSES, build_registry
from buzzard_ai_complete.ai_council_18_unified.service import AiCouncil18Service


def test_exactly_18_specialists():
    assert len(AGENT_CLASSES) == 18


def test_shared_memory():
    memory = SharedIntelligenceMemory()
    router = build_registry(memory)
    orch = CouncilOrchestrator(router, memory, CouncilGuardrails())
    case = CouncilCase("case-1", "Evaluate a new product opportunity")
    ids = [agent.agent_id for agent in router.all()]
    result = orch.run_case(case, ids)
    assert len(result.findings) == 18
    assert len(memory.findings) == 18


def test_information_flows_between_agents():
    memory = SharedIntelligenceMemory()
    router = build_registry(memory)
    first = router.get("market_intelligence_ai")
    finding = first.analyze("Test market", {}, memory.context(first.input_topics))
    memory.add_finding(finding)
    second = router.get("chief_strategy_ai")
    context = memory.context(second.input_topics)
    assert any(context.values())


def test_consensus():
    memory = SharedIntelligenceMemory()
    router = build_registry(memory)
    orch = CouncilOrchestrator(router, memory, CouncilGuardrails())
    case = CouncilCase("case-2", "Test")
    result = orch.run_case(case, [agent.agent_id for agent in router.all()])
    consensus = orch.consensus(result)
    assert consensus["findings"] == 18
    assert consensus["status"] == "review_required"


def test_service_health():
    health = AiCouncil18Service().health()
    assert health["status"] == "unified_council_ready"
    assert health["agents"] == 18
    assert health["live_activation"] is False
