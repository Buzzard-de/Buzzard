from buzzard_ai_complete.agriculture_maximal.agriculture.intelligence.market import (
    AgricultureMarketSignals,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.service.catalog import (
    AgricultureCatalogService,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.taxonomy.master import (
    AGRICULTURE_TAXONOMY,
)
from buzzard_ai_complete.agriculture_maximal.service import AgricultureService


def test_major_branches():
    for key in ["tractor", "combine_harvester", "spare_parts", "consumables", "irrigation", "greenhouse", "tools"]:
        assert key in AGRICULTURE_TAXONOMY


def test_deep_categories():
    assert "engine" in AGRICULTURE_TAXONOMY["spare_parts"]["subcategories"]
    assert "Piston" in AGRICULTURE_TAXONOMY["spare_parts"]["subcategories"]["engine"]["sub_sub"]


def test_catalog_service():
    service = AgricultureCatalogService(AGRICULTURE_TAXONOMY)
    assert service.list_subcategories("tractor")
    assert service.list_sub_subcategories("tractor", "standard")


def test_market_score():
    score = AgricultureMarketSignals().score(90, 60, 80, 85, 10)
    assert 0 <= score <= 100


def test_service_health():
    health = AgricultureService().health()
    assert health["status"] == "maximal_agriculture_ready"
    assert health["branches"] == 9
    assert health["live_activation"] is False
