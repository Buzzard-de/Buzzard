import json
from pathlib import Path

def test_catalog_is_large():
    root = Path(__file__).parents[1]
    sites = json.loads((root / "config/sites.json").read_text(encoding="utf-8"))
    manifest = json.loads((root / "MANIFEST.json").read_text(encoding="utf-8"))
    assert len(sites) >= manifest["site_count"]

def test_safety_policy():
    p=Path(__file__).parents[1]/"config/policies.json"
    d=json.loads(p.read_text(encoding="utf-8"))
    assert "CAPTCHA_BYPASS" in d["blocked_modes"]
    assert d["respect_rate_limits"] is True
