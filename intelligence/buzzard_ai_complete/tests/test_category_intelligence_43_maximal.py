from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.agent import (
    CategoryIntelligenceAgent,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.crawling.policy import (
    PublicWebPolicy,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.models import (
    CategoryNode,
    SellerOffer,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.opportunities.scoring import (
    OpportunityScorer,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.pricing.engine import (
    PriceIntelligenceEngine,
)
from buzzard_ai_complete.category_intelligence_43_maximal.category_intelligence.registry import build_43_agents
from buzzard_ai_complete.category_intelligence_43_maximal.service import CategoryIntelligence43Service


def defs():
    return [{"category_id": f"C{i:02d}", "name": f"Category {i}"} for i in range(1, 44)]


def test_exactly_43_agents():
    agents = build_43_agents(defs())
    assert len(agents) == 43


def test_agents_are_specialized():
    agents = build_43_agents(defs())
    assert agents["C01"].category_id == "C01"
    assert agents["C43"].category_id == "C43"
    assert agents["C01"] is not agents["C02"]


def test_price_engine():
    offers = [
        SellerOffer("s1", "Seller 1", "P1", "Product", 10),
        SellerOffer("s2", "Seller 2", "P1", "Product", 12),
        SellerOffer("s3", "Seller 3", "P2", "Product 2", 20),
    ]
    result = PriceIntelligenceEngine().seller_comparison(offers)
    assert result["summary"]["unique_sellers"] == 3
    assert result["summary"]["min"] == 10


def test_taxonomy_gap():
    buzzard = CategoryNode("a", "Our Category", 1)
    competitor = CategoryNode("b", "Competitor Subcategory", 2, "a", "competitor")
    agent = CategoryIntelligenceAgent("C01", "Category 1")
    report = agent.analyze([], [buzzard], [buzzard, competitor])
    assert len(report.missing_categories) == 1


def test_public_web_guardrail():
    policy = PublicWebPolicy()
    assert policy.allow("https://example.com", robots_allowed=True)[0]
    assert not policy.allow("https://example.com", robots_allowed=False)[0]
    assert not policy.allow("https://example.com", authenticated=True)[0]


def test_opportunity_score():
    score = OpportunityScorer().score(10, 10, 70, 70, 80, 90, 0, 0)
    assert 0 <= score <= 100


def test_service_health():
    health = CategoryIntelligence43Service().health()
    assert health["status"] == "category_intelligence_ready"
    assert health["agents"] == 55
    assert health["live_activation"] is False
