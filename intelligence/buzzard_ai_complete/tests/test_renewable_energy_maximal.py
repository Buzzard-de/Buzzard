from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.compatibility.engine import (
    CompatibilityEngine,
)
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.intelligence.market import (
    MarketIntelligence,
)
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.models import (
    EnergySystem,
    Product,
)
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.service.catalog import (
    RenewableEnergyCatalog,
)
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.taxonomy.master import (
    RENEWABLE_ENERGY_TAXONOMY,
)
from buzzard_ai_complete.renewable_energy_maximal.service import RenewableEnergyService


def test_major_branches():
    for key in ["solar", "wind", "energy_storage", "hybrid", "home_building", "agriculture_energy"]:
        assert key in RENEWABLE_ENERGY_TAXONOMY


def test_deep_categories():
    assert "panels" in RENEWABLE_ENERGY_TAXONOMY["solar"]["subcategories"]
    assert "Monokristal" in RENEWABLE_ENERGY_TAXONOMY["solar"]["subcategories"]["panels"]["sub_sub"]


def test_catalog_service():
    catalog = RenewableEnergyCatalog(RENEWABLE_ENERGY_TAXONOMY)
    assert catalog.subcategories("solar")
    assert catalog.sub_subcategories("solar", "panels")


def test_compatibility_engine():
    system = EnergySystem("s1", "solar", voltage="230V", power_kw=5.0)
    product = Product("p1", "Inverter", "solar/inverters", attributes={"voltage": "230V", "power_kw": 5.0})
    result = CompatibilityEngine().match(system, product)
    assert result["status"] == "compatible"
    assert result["confidence"] == 1.0


def test_market_score():
    score = MarketIntelligence().score(88, 75, 70, 80, 65, 12)
    assert 0 <= score <= 100


def test_service_health():
    health = RenewableEnergyService().health()
    assert health["status"] == "maximal_renewable_energy_ready"
    assert health["main_category"] == "Güneş & Rüzgâr Enerjisi"
    assert health["branches"] == 9
    assert health["live_activation"] is False


def test_taxonomy_json():
    doc = RenewableEnergyService().load_taxonomy()
    assert doc["main_category"] == "Güneş & Rüzgâr Enerjisi"
    assert "solar" in doc["taxonomy"]
    assert doc["taxonomy"] == RENEWABLE_ENERGY_TAXONOMY
