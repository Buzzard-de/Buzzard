from buzzard_ai_complete.marketing.engine import MarketingEngine
from buzzard_ai_complete.marketing.models import Campaign, Performance
from buzzard_ai_complete.marketing.optimization import recommend_action
from buzzard_ai_complete.marketing.performance import evaluate
from buzzard_ai_complete.marketing.compliance import validate_marketing_data


def test_budget_allocation():
    engine = MarketingEngine()
    allocation = engine.allocate_budget(
        1000,
        ["google_ads", "meta_ads"],
        {"google_ads": 2, "meta_ads": 1},
    )
    assert allocation["google_ads"] == 666.67


def test_performance():
    performance = Performance("C1", 100, 400, 10, 100, 1000)
    assert performance.roas == 4.0
    assert evaluate(performance)["status"] == "ABOVE_TARGET"


def test_optimization():
    assert recommend_action(5) == "SCALE_CAUTIOUSLY"
    assert recommend_action(1) == "REDUCE_OR_PAUSE"


def test_consent_gate():
    assert validate_marketing_data(False, "RETARGETING")["allowed"] is False
    assert validate_marketing_data(True, "RETARGETING")["allowed"] is True


def test_no_fake_provider_success():
    engine = MarketingEngine()
    campaign = Campaign("C1", "Test", "Google Ads", 100)
    assert engine.create_campaign("google_ads", campaign)["status"] == "NOT_CONFIGURED"


def test_provider_status():
    status = MarketingEngine().provider_status()
    assert status["google_ads"]["status"] == "NOT_CONFIGURED"
    assert status["meta_ads"]["status"] == "NOT_CONFIGURED"
