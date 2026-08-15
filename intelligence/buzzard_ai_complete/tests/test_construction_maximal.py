from buzzard_ai_complete.construction_maximal.construction.catalog import ConstructionCatalog
from buzzard_ai_complete.construction_maximal.construction.intelligence.market import (
    ConstructionMarketSignals,
)
from buzzard_ai_complete.construction_maximal.construction.taxonomy.master import (
    CONSTRUCTION_TAXONOMY,
)
from buzzard_ai_complete.construction_maximal.service import ConstructionService


def test_major_branches():
    for key in ["construction_materials", "earthmoving", "concrete", "lifting", "machine_parts", "attachments"]:
        assert key in CONSTRUCTION_TAXONOMY


def test_deep_taxonomy():
    assert "Ekskavatör" in CONSTRUCTION_TAXONOMY["earthmoving"]["sub_sub"]
    assert "Hidrolik Pompa" in CONSTRUCTION_TAXONOMY["machine_parts"]["sub_sub"]


def test_catalog():
    catalog = ConstructionCatalog(CONSTRUCTION_TAXONOMY)
    assert catalog.sub_subcategories("earthmoving")
    assert catalog.search("vinç")


def test_market_score():
    score = ConstructionMarketSignals().score(88, 70, 82, 78, 65, 12)
    assert 0 <= score <= 100


def test_taxonomy_json():
    doc = ConstructionService().load_taxonomy()
    assert doc["main_category"] == "İnşaat & İnşaat Makineleri"
    assert doc["taxonomy"] == CONSTRUCTION_TAXONOMY


def test_service_health():
    health = ConstructionService().health()
    assert health["status"] == "maximal_construction_ready"
    assert health["branches"] == 22
    assert health["live_activation"] is False
