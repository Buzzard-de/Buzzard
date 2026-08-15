import json
from pathlib import Path

from buzzard_ai_complete.ai_council_18_unified.council.memory.shared_memory import SharedIntelligenceMemory
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.agent import SocialIntelligenceAI
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.models import SocialEvidence
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.orchestration.event_bus import (
    SocialEventBus,
)
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.platforms.registry import (
    build_platform_registry,
)
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.signals.engine import SocialSignalEngine

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class SocialIntelligenceService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "social_intelligence.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "social_signal.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        guardrails = config.get("guardrails", {})
        return {
            "service": "social-intelligence-ai-maximal",
            "status": "social_intelligence_ready",
            "agent": config.get("agent", {}).get("id", "social_intelligence_ai"),
            "platforms": len(build_platform_registry()),
            "public_or_authorized_only": guardrails.get("public_or_authorized_only", True),
            "no_auto_posting": guardrails.get("no_auto_posting", True),
            "no_auto_ad_spend": guardrails.get("no_auto_ad_spend", True),
            "live_activation": False,
        }

    def list_platforms(self):
        registry = build_platform_registry()
        return [
            {"platform": name, "health": adapter.health()}
            for name, adapter in registry.items()
        ]

    def demo_flow(self):
        memory = SharedIntelligenceMemory()
        event_bus = SocialEventBus()
        events = []
        event_bus.subscribe("social.report", events.append)
        agent = SocialIntelligenceAI(shared_memory=memory, event_bus=event_bus)
        evidence = [
            SocialEvidence(
                platform="instagram",
                source_url="https://example.com/1",
                observed_at="2026-08-16",
                title="product",
                engagement={"likes": 100, "comments": 10, "shares": 5},
            ),
            SocialEvidence(
                platform="tiktok",
                source_url="https://example.com/2",
                observed_at="2026-08-16",
                title="product",
                engagement={"likes": 100},
            ),
            SocialEvidence(
                platform="youtube",
                source_url="https://example.com/3",
                observed_at="2026-08-16",
                title="product",
                engagement={"views": 1000},
            ),
        ]
        result = agent.analyze(evidence, known_products=["existing"], known_categories=["auto"])
        return {
            "health": self.health(),
            "platforms": self.list_platforms(),
            "analysis": result,
            "cross_platform_strength": SocialSignalEngine().cross_platform_strength(evidence),
            "shared_memory_findings": len(memory.findings),
            "event_bus_reports": len(events),
        }
