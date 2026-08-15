from buzzard_ai_complete.construction_maximal.construction.catalog import ConstructionCatalog
from buzzard_ai_complete.construction_maximal.construction.compatibility.engine import (
    ConstructionFitmentEngine,
)
from buzzard_ai_complete.construction_maximal.construction.intelligence.market import (
    ConstructionMarketIntelligence,
    ConstructionMarketSignals,
)
from buzzard_ai_complete.construction_maximal.construction.models import (
    ConstructionMachine,
    ConstructionPart,
)
from buzzard_ai_complete.construction_maximal.construction.service.intelligence import (
    ConstructionIntelligence,
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
    assert catalog.categories() == CONSTRUCTION_TAXONOMY
    assert catalog.sub_subcategories("earthmoving")
    assert catalog.search("vinç")


def test_fitment_match_compatible():
    engine = ConstructionFitmentEngine()
    machine = ConstructionMachine(
        "m1",
        "earthmoving",
        make="Caterpillar",
        model="320",
        engine_code="C7.1",
    )
    part = ConstructionPart(
        "p1",
        "Hidrolik Pompa",
        "machine_parts/hydraulic",
        attributes={
            "machine_type": "earthmoving",
            "make": "Caterpillar",
            "model": "320",
            "engine_code": "C7.1",
        },
    )
    result = engine.match(machine, part)
    assert result.status == "compatible"
    assert result.confidence == 1.0


def test_fitment_match_unknown():
    engine = ConstructionFitmentEngine()
    machine = ConstructionMachine("m1", "earthmoving")
    part = ConstructionPart("p1", "Genel Parça", "machine_parts/general", attributes={})
    result = engine.match(machine, part)
    assert result.status == "unknown"
    assert result.confidence == 0.0


def test_fitment_match_review():
    engine = ConstructionFitmentEngine()
    machine = ConstructionMachine("m1", "earthmoving", make="Caterpillar", model="320")
    part = ConstructionPart(
        "p1",
        "Hidrolik Pompa",
        "machine_parts/hydraulic",
        attributes={"machine_type": "earthmoving", "make": "Komatsu", "model": "320"},
    )
    result = engine.match(machine, part)
    assert result.status == "review"
    assert 0 < result.confidence < 1


def test_market_score():
    score = ConstructionMarketSignals().score(88, 70, 82, 78, 65, 12)
    assert 0 <= score <= 100
    intel_score = ConstructionMarketIntelligence().score(88, 70, 82, 78, 65, 12)
    assert 0 <= intel_score <= 100


def test_product_opportunity():
    result = ConstructionIntelligence().product_opportunity(
        product={"id": "p1", "name": "Hidrolik Pompa"},
        market_signal={"score": 85, "priority": "high"},
    )
    assert result["requires_human_review"] is False


def test_taxonomy_json():
    doc = ConstructionService().load_taxonomy()
    assert doc["main_category"] == "İnşaat & İnşaat Makineleri"
    assert doc["taxonomy"] == CONSTRUCTION_TAXONOMY


def test_service_health():
    health = ConstructionService().health()
    assert health["status"] == "maximal_construction_ready"
    assert health["branches"] == 22
    assert health["live_activation"] is False


def test_demo_flow_match():
    demo = ConstructionService().demo_flow()
    assert demo["fitment"]["match"]["status"] == "compatible"
    assert demo["opportunity"]["requires_human_review"] is False
