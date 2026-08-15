import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.compatibility.engine import (
    CompatibilityEngine,
)
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.intelligence.gaps import (
    CategoryGapDetector,
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
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.service.intelligence import (
    RenewableEnergyIntelligence,
)
from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.taxonomy.master import (
    RENEWABLE_ENERGY_TAXONOMY,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class RenewableEnergyService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "renewable_energy.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "renewable_energy.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        rules = config.get("rules", {})
        return {
            "service": "renewable-energy-maximal",
            "status": "maximal_renewable_energy_ready",
            "main_category": config.get("name", "Yenilenebilir Enerji"),
            "branches": len(config.get("branches", [])),
            "taxonomy_nodes": len(RENEWABLE_ENERGY_TAXONOMY),
            "compatibility_requires_evidence": rules.get("compatibility_requires_evidence", True),
            "category_gap_detection": rules.get("category_gap_detection", True),
            "live_activation": False,
        }

    def list_branches(self):
        return [
            {"id": key, "name": value["name"]}
            for key, value in RENEWABLE_ENERGY_TAXONOMY.items()
        ]

    def demo_flow(self):
        catalog = RenewableEnergyCatalog(RENEWABLE_ENERGY_TAXONOMY)
        system = EnergySystem(
            "s1",
            "solar",
            manufacturer="SMA",
            model="Sunny Boy",
            voltage="230V",
            power_kw=5.0,
        )
        product = Product(
            "p1",
            "Hybrid Inverter 5kW",
            "solar/inverters",
            attributes={"voltage": "230V", "power_kw": 5.0},
            source="verified",
        )
        compatibility = CompatibilityEngine().match(system, product)
        market = MarketIntelligence()
        score = market.score(88, 75, 70, 80, 65, 12)
        gaps = CategoryGapDetector().compare(
            ["solar", "wind", "energy_storage"],
            ["solar", "wind", "energy_storage", "hydrogen"],
        )
        analysis = RenewableEnergyIntelligence().analyze(
            product={"id": product.product_id, "name": product.name},
            market={"score": score, "priority": market.priority(score)},
        )
        return {
            "health": self.health(),
            "branches": self.list_branches(),
            "catalog": {
                "solar_subcategories": list(catalog.subcategories("solar").keys()),
                "solar_panel_types": catalog.sub_subcategories("solar", "panels"),
                "search_mppt": catalog.search("mppt"),
            },
            "compatibility": compatibility,
            "system": asdict(system),
            "market": {"score": score, "priority": market.priority(score)},
            "gaps": gaps,
            "analysis": analysis,
        }
