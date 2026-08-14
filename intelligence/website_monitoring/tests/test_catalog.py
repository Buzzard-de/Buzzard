import json
from pathlib import Path

def test_catalog_is_large():
    p=Path(__file__).parents[1]/"config/sites.json"
    data=json.loads(p.read_text(encoding="utf-8"))
    assert len(data)>=40

def test_safety_policy():
    p=Path(__file__).parents[1]/"config/policies.json"
    d=json.loads(p.read_text(encoding="utf-8"))
    assert "CAPTCHA_BYPASS" in d["blocked_modes"]
    assert d["respect_rate_limits"] is True
