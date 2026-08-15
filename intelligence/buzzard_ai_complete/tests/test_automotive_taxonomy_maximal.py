from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.catalog.engine import (
    AutomotiveTaxonomy,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.catalog.master_seed import (
    MASTER_SYSTEMS,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.compatibility.fitment import (
    FitmentEngine,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.compatibility.selector import (
    VehicleSelector,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.models import (
    FitmentRule,
    TaxonomyNode,
    VehicleProfile,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.validation.validator import (
    AutomotiveTaxonomyValidator,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService


def build():
    nodes = [
        TaxonomyNode("auto", "Otomotiv", 1),
        TaxonomyNode("brakes", "Fren Sistemi", 2, "auto"),
        TaxonomyNode("pads", "Fren Balataları", 3, "brakes"),
        TaxonomyNode("front-pads", "Ön Fren Balataları", 4, "pads"),
    ]
    return AutomotiveTaxonomy(nodes=nodes)


def test_master_seed_is_large():
    assert len(MASTER_SYSTEMS) >= 90


def test_path():
    taxonomy = build()
    assert [node.name for node in taxonomy.path("front-pads")] == [
        "Otomotiv",
        "Fren Sistemi",
        "Fren Balataları",
        "Ön Fren Balataları",
    ]


def test_children():
    taxonomy = build()
    assert len(taxonomy.children("brakes")) == 1


def test_vehicle_selector():
    vehicle = VehicleProfile("v1", "BMW", "320d", year_from=2018, year_to=2020, engine_code="B47")
    selector = VehicleSelector([vehicle])
    assert len(selector.select(make="BMW", model="320d", year=2019, engine_code="B47")) == 1
    assert len(selector.select(make="BMW", model="320d", year=2022)) == 0


def test_fitment():
    taxonomy = build()
    fitment = FitmentEngine(taxonomy)
    vehicle = VehicleProfile("v1", "BMW", "320d")
    fitment.add_rule(FitmentRule("p1", "v1", "front", "front", "B47", "verified", "source", 0.95))
    assert len(fitment.find(vehicle, "p1", "front")) == 1


def test_validator():
    taxonomy = build()
    assert AutomotiveTaxonomyValidator().validate(taxonomy) == []


def test_service_health():
    health = AutomotiveTaxonomyService().health()
    assert health["status"] == "maximal_automotive_taxonomy_ready"
    assert health["master_systems"] >= 90
    assert health["live_activation"] is False
