from buzzard_ai_complete.core.policies import BuzzardPolicy
from buzzard_ai_complete.security.rate_limit import RateLimiter
from buzzard_ai_complete.monitoring.health import health
from buzzard_ai_complete.integrations.llm.mock import MockLLMProvider

def test_policy_blocks_offensive_actions():
    assert BuzzardPolicy().decide("offensive_intrusion").allowed is False

def test_policy_allows_research():
    assert BuzzardPolicy().decide("public_research").allowed is True

def test_rate_limiter():
    r = RateLimiter(limit=1, window_seconds=60)
    assert r.allow("x") is True
    assert r.allow("x") is False

def test_health():
    assert health()["status"] == "ok"

def test_mock_llm():
    assert MockLLMProvider().complete([])["provider"] == "mock"
