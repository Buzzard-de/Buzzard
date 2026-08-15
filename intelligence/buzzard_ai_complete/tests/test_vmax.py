from buzzard_ai_complete.vmax.platform import BuzzardMaxPlatform
from buzzard_ai_complete.vmax.security import WebhookVerifier
from buzzard_ai_complete.vmax.reliability import RetryPolicy
from buzzard_ai_complete.vmax.idempotency import IdempotencyRegistry
from buzzard_ai_complete.vmax.rate_limit import TokenBucket
from buzzard_ai_complete.vmax.data_quality import DataQuality
from buzzard_ai_complete.vmax.feature_flags import FeatureFlags
from buzzard_ai_complete.vmax.catalog import ProductIntelligence
from buzzard_ai_complete.vmax.decisions import DecisionEngine


def test_platform():
    platform = BuzzardMaxPlatform()
    platform.register_module("commerce", "VMAX", ["catalog", "pricing", "orders"])
    platform.health.set("commerce", "OK")
    platform.policy.add("public_research", True)
    snapshot = platform.snapshot()
    assert snapshot["modules"]["commerce"]["version"] == "VMAX"
    assert snapshot["health"]["commerce"]["status"] == "OK"


def test_webhook_signature():
    import hashlib
    import hmac

    payload = "hello"
    secret = "secret"
    signature = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    assert WebhookVerifier.verify(payload, signature, secret)


def test_retry():
    state = {"n": 0}

    def fn():
        state["n"] += 1
        if state["n"] < 3:
            raise RuntimeError("temporary")
        return "OK"

    assert RetryPolicy(max_attempts=3, base_delay=0).run(fn) == "OK"


def test_idempotency():
    registry = IdempotencyRegistry()
    assert registry.execute("x", lambda: 5) == 5
    assert registry.execute("x", lambda: 9) == 5


def test_rate_limit():
    bucket = TokenBucket(capacity=1, refill_per_second=0)
    assert bucket.allow()
    assert not bucket.allow()


def test_data_quality():
    quality = DataQuality()
    assert quality.score({"a": 1, "b": 2}, ["a", "b"]) == 1.0


def test_feature_flag():
    flags = FeatureFlags()
    flags.set("x", True)
    assert flags.enabled("x")


def test_product_intelligence():
    product = ProductIntelligence().score(10, 20, 2, 2, 1)
    assert product["profit"] == 5


def test_decision():
    engine = DecisionEngine()
    assert engine.decide({"profitable": True, "stock_available": True}) == "PROCEED"
    assert engine.decide({"security_block": True}) == "BLOCK"
