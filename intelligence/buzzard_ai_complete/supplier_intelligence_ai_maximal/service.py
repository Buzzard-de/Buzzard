import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.supplier_intelligence_ai_maximal.supplier_intelligence.engine import (
    Decision,
    Evidence,
    SupplierDiscoveryPolicy,
    SupplierIntelligenceEngine,
    SupplierMemory,
    SupplierProfile,
    SupplierReport,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class SupplierIntelligenceService:
    def load_config(self):
        return json.loads(
            (CONFIG_DIR / "supplier_intelligence.production.json").read_text(encoding="utf-8")
        )

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "supplier_schema.json").read_text(encoding="utf-8"))

    def load_risk_policy(self):
        return json.loads((DATA_DIR / "risk_policy.json").read_text(encoding="utf-8"))

    def engine(self):
        config = self.load_config()
        return SupplierIntelligenceEngine(
            minimum_evidence=config.get("guardrails", {}).get("minimum_evidence", 2)
        )

    def sample_profile(self):
        return SupplierProfile(
            supplier_id="SUP-001",
            legal_name="Example Supplier GmbH",
            country="DE",
            website="https://example.com",
            evidence=[
                Evidence(
                    "official_company_site",
                    "https://example.com",
                    "company identity",
                    "2026-08-16",
                ),
                Evidence(
                    "official_registry",
                    "registry-ref",
                    "legal registration",
                    "2026-08-16",
                ),
            ],
            commercial_terms={"tax_vat": "verified", "moq": 1, "api_xml_csv": True},
        )

    def sample_signals(self, value=90.0):
        return {key: value for key in SupplierIntelligenceEngine.WEIGHTS}

    def health(self):
        config = self.load_config()
        guardrails = config.get("guardrails", {})
        policy = self.load_risk_policy()
        return {
            "service": "supplier-intelligence-ai-maximal",
            "status": "supplier_intelligence_ready",
            "package": config.get("name"),
            "version": config.get("version"),
            "agent": config.get("agent", {}).get("id"),
            "pipeline_steps": len(config.get("pipeline", [])),
            "risk_dimensions": len(SupplierIntelligenceEngine.WEIGHTS),
            "allowed_sources": len(SupplierDiscoveryPolicy.ALLOWED_SOURCES),
            "decision_bands": policy.get("decision_bands", {}),
            "public_open_sources_only": guardrails.get("public_open_sources_only", True),
            "human_approval_required": guardrails.get("human_approval_required", True),
            "live_activation": False,
            "BUZZARD_SALES_ENABLED": 0,
        }

    def evaluate_profile(self, profile: SupplierProfile, signals=None, red_flags=None):
        engine = self.engine()
        risk = engine.score(profile, signals or self.sample_signals(), red_flags=red_flags)
        return SupplierReport.build(profile, risk)

    def demo_flow(self):
        engine = self.engine()
        policy = SupplierDiscoveryPolicy()
        memory = SupplierMemory()
        primary = self.sample_profile()
        secondary = SupplierProfile(
            supplier_id="SUP-002",
            legal_name="B GmbH",
            evidence=[
                Evidence(
                    "official_company_site",
                    "https://b.example",
                    "identity",
                    "2026-08-16",
                ),
                Evidence(
                    "official_registry",
                    "registry-b",
                    "registration",
                    "2026-08-16",
                ),
            ],
        )
        primary_report = self.evaluate_profile(primary, self.sample_signals(90))
        fraud_report = self.evaluate_profile(primary, self.sample_signals(95), ["suspected_fraud"])
        memory.record("SUP-001", "price_change", {"old": 10, "new": 11})
        comparison = engine.compare(
            [primary, secondary],
            {"SUP-001": self.sample_signals(90), "SUP-002": self.sample_signals(70)},
        )
        return {
            "health": self.health(),
            "primary_report": primary_report,
            "fraud_case": {
                "recommendation": fraud_report["recommendation"],
                "human_approval_required": fraud_report["human_approval_required"],
            },
            "onboarding_checklist": engine.onboarding_checklist(primary),
            "comparison": [
                {"supplier_id": row[0], "score": row[1], "decision": row[2]}
                for row in comparison
            ],
            "source_policy": {
                "official_registry": policy.validate_source("official_registry"),
                "private_account": policy.validate_source("private_account"),
            },
            "memory_events": len(memory.history("SUP-001")),
            "decision_enum": [item.value for item in Decision],
        }
