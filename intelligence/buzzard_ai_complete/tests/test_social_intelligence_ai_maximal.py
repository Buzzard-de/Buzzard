from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.agent import SocialIntelligenceAI
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.analysis.opportunity import (
    SocialOpportunityEngine,
)
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.models import SocialEvidence
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.privacy.policy import (
    SocialPublicDataPolicy,
)
from buzzard_ai_complete.social_intelligence_ai_maximal.social_intelligence.signals.engine import (
    SocialSignalEngine,
)
from buzzard_ai_complete.social_intelligence_ai_maximal.service import SocialIntelligenceService


def test_platforms():
    agent = SocialIntelligenceAI()
    assert len(agent.platforms) == 9
    assert {"facebook", "instagram", "tiktok", "youtube", "pinterest", "reddit", "x", "linkedin", "forums"} == set(
        agent.platforms
    )


def test_public_policy():
    policy = SocialPublicDataPolicy()
    assert policy.allow_source({"public_or_authorized": True})[0]
    assert not policy.allow_source({"private": True, "public_or_authorized": True})[0]
    assert not policy.allow_source({"authenticated_area": True, "public_or_authorized": True})[0]


def test_signal_engine():
    evidence = SocialEvidence(
        source_url="https://example.com/post/1",
        platform="instagram",
        observed_at="2026-08-16",
        title="engine oil",
        engagement={"likes": 100, "comments": 10, "shares": 5},
    )
    result = SocialSignalEngine().aggregate([evidence])
    assert len(result) == 1
    assert result[0]["platforms"] == ["instagram"]


def test_cross_platform():
    evidence = [
        SocialEvidence(
            source_url="https://example.com/1",
            platform="instagram",
            observed_at="2026-08-16",
            title="product",
            engagement={"likes": 100},
        ),
        SocialEvidence(
            source_url="https://example.com/2",
            platform="tiktok",
            observed_at="2026-08-16",
            title="product",
            engagement={"likes": 100},
        ),
        SocialEvidence(
            source_url="https://example.com/3",
            platform="youtube",
            observed_at="2026-08-16",
            title="product",
            engagement={"views": 1000},
        ),
    ]
    assert SocialSignalEngine().cross_platform_strength(evidence) > 40


def test_opportunity():
    score = SocialOpportunityEngine().score(90, 80, 70, 80, 80, 10)
    assert 0 <= score <= 100


def test_service_health():
    health = SocialIntelligenceService().health()
    assert health["status"] == "social_intelligence_ready"
    assert health["platforms"] == 9
    assert health["live_activation"] is False
