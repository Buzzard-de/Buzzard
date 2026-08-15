from buzzard_ai_complete.livestock_maximal.livestock.catalog import LivestockCatalog
from buzzard_ai_complete.livestock_maximal.livestock.intelligence.opportunity import (
    LivestockOpportunity,
)
from buzzard_ai_complete.livestock_maximal.livestock.taxonomy.master import LIVESTOCK_TAXONOMY
from buzzard_ai_complete.livestock_maximal.service import LivestockService


def test_main_groups():
    for key in ["cattle", "sheep_goat", "poultry", "horse", "beekeeping", "aquaculture", "machinery", "automation"]:
        assert key in LIVESTOCK_TAXONOMY


def test_deep_taxonomy():
    assert "dairy" in LIVESTOCK_TAXONOMY["cattle"]["subcategories"]
    assert "Sağım" in LIVESTOCK_TAXONOMY["cattle"]["subcategories"]["dairy"]["sub_sub"]
    assert "Vakum Pompası" in LIVESTOCK_TAXONOMY["milking"]["subcategories"]["vacuum"]["sub_sub"]


def test_catalog():
    catalog = LivestockCatalog(LIVESTOCK_TAXONOMY)
    assert catalog.subcategories("cattle")
    assert catalog.sub_subcategories("cattle", "dairy")


def test_score():
    score = LivestockOpportunity().score(90, 80, 85, 75, 70, 10)
    assert 0 <= score <= 100


def test_service_health():
    health = LivestockService().health()
    assert health["status"] == "maximal_livestock_ready"
    assert health["main_category"] == "Hayvancılık"
    assert health["live_activation"] is False
