from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.tires.service import (
    TireIntelligence,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.tires.taxonomy import (
    TIRE_TAXONOMY,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService


def test_separate_category():
    assert "passenger_car" in TIRE_TAXONOMY
    assert "tractor" in TIRE_TAXONOMY
    assert "motorcycle" in TIRE_TAXONOMY
    assert "construction_industrial" in TIRE_TAXONOMY


def test_deep_tree():
    assert "summer" in TIRE_TAXONOMY["passenger_car"]["subcategories"]
    assert "UHP" in TIRE_TAXONOMY["passenger_car"]["subcategories"]["performance"]["sub_sub"]


def test_size():
    assert TireIntelligence().validate_size(205, 55, 16)["valid"]
    assert not TireIntelligence().validate_size(0, 55, 16)["valid"]


def test_service_tires_health():
    health = AutomotiveTaxonomyService().health()
    assert health["tires_category"] == "Lastikler"
    assert health["tires_vehicle_types"] == 12


def test_service_tires_demo():
    demo = AutomotiveTaxonomyService().tires_demo()
    assert demo["size_validation"]["valid"] is True
    assert "passenger_car" in demo["vehicle_types"]
