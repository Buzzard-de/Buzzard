import json
from pathlib import Path

from buzzard_ai_complete.multilingual_product_intelligence.service import (
    MultilingualProductIntelligenceService,
)

DATA = Path(__file__).resolve().parents[1] / "multilingual_product_intelligence" / "data"


def test_language_count():
    config = json.loads((DATA / "languages.json").read_text(encoding="utf-8"))
    assert config["supported_count"] >= 50


def test_arabic_rtl():
    config = json.loads((DATA / "languages.json").read_text(encoding="utf-8"))
    assert any(item["code"] == "ar" and item["rtl"] for item in config["languages"])


def test_groups():
    config = json.loads((DATA / "languages.json").read_text(encoding="utf-8"))
    assert {"Europe", "Nordic", "Balkans", "Arab"}.issubset(set(config["groups"]))


def test_normalize_detects_arabic():
    service = MultilingualProductIntelligenceService()
    result = service.normalize("فحمات الفرامل")
    assert result["language"] == "ar"
    assert result["rtl"] is True


def test_demo_flow():
    service = MultilingualProductIntelligenceService()
    demo = service.demo_flow()
    assert demo["health"]["supported_languages"] >= 50
    assert len(demo["samples"]) == 3
