from buzzard_ai_complete.ai_council_18_unified.council.orchestration.router import AgentRouter
from buzzard_ai_complete.ai_council_18_unified.council.registry import AGENT_CLASSES as AGENT_CLASSES_18

from buzzard_ai_complete.ai_council_19_customs_bureaucracy.council.agents.customs_bureaucracy_ai import (
    CustomsBureaucracyAi,
)

AGENT_CLASSES = list(AGENT_CLASSES_18) + [CustomsBureaucracyAi]


def build_registry19(memory=None):
    router = AgentRouter()
    for cls in AGENT_CLASSES:
        router.register(cls(memory))
    return router
