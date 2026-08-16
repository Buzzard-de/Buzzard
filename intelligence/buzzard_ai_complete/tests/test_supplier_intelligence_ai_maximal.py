from buzzard_ai_complete.supplier_intelligence_ai_maximal.supplier_intelligence.engine import (
    Decision,
    Evidence,
    SupplierDiscoveryPolicy,
    SupplierIntelligenceEngine,
    SupplierMemory,
    SupplierProfile,
)
from buzzard_ai_complete.supplier_intelligence_ai_maximal.service import SupplierIntelligenceService


def sample_profile():
    return SupplierProfile(
        supplier_id="SUP-001",
        legal_name="Example Supplier GmbH",
        country="DE",
        website="https://example.com",
        evidence=[
            Evidence("official_company_site", "https://example.com", "company identity", "2026-08-16"),
            Evidence("official_registry", "registry-ref", "legal registration", "2026-08-16"),
        ],
        commercial_terms={"tax_vat": "verified", "moq": 1, "api_xml_csv": True},
    )


def sample_signals(value=90.0):
    return {key: value for key in SupplierIntelligenceEngine.WEIGHTS}


def test_high_quality_supplier():
    engine = SupplierIntelligenceEngine()
    result = engine.score(sample_profile(), sample_signals(90))
    assert result.score >= 85
    assert result.decision == Decision.APPROVE


def test_missing_evidence_caps_score():
    profile = sample_profile()
    profile.evidence = []
    result = SupplierIntelligenceEngine().score(profile, sample_signals(100))
    assert result.score <= 59


def test_fraud_signal_is_not_approved():
    result = SupplierIntelligenceEngine().score(
        sample_profile(), sample_signals(95), ["suspected_fraud"]
    )
    assert result.decision in {Decision.REVIEW, Decision.REJECT}


def test_unknown_missing_signal_is_not_positive():
    result = SupplierIntelligenceEngine().score(sample_profile(), {})
    assert result.score < 65


def test_onboarding_checklist():
    checklist = SupplierIntelligenceEngine().onboarding_checklist(sample_profile())
    assert checklist["tax_vat"] is True
    assert checklist["moq"] is True
    assert checklist["stock_feed"] is False


def test_source_policy():
    policy = SupplierDiscoveryPolicy()
    assert policy.validate_source("official_registry")
    assert not policy.validate_source("private_account")


def test_memory():
    memory = SupplierMemory()
    memory.record("SUP-001", "price_change", {"old": 10, "new": 11})
    assert len(memory.history("SUP-001")) == 1


def test_compare():
    engine = SupplierIntelligenceEngine()
    primary = sample_profile()
    secondary = SupplierProfile(
        "SUP-002",
        "B GmbH",
        evidence=[
            Evidence("official_company_site", "https://b.example", "identity", "2026-08-16"),
            Evidence("official_registry", "registry-b", "registration", "2026-08-16"),
        ],
    )
    rows = engine.compare(
        [primary, secondary],
        {"SUP-001": sample_signals(90), "SUP-002": sample_signals(70)},
    )
    assert rows[0][0] == "SUP-001"


def test_service_health():
    health = SupplierIntelligenceService().health()
    assert health["status"] == "supplier_intelligence_ready"
    assert health["human_approval_required"] is True
    assert health["live_activation"] is False
    assert health["BUZZARD_SALES_ENABLED"] == 0


def test_demo_flow():
    demo = SupplierIntelligenceService().demo_flow()
    assert demo["primary_report"]["recommendation"] == "APPROVE"
    assert demo["fraud_case"]["human_approval_required"] is True
    assert demo["comparison"][0]["supplier_id"] == "SUP-001"
