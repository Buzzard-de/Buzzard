import json
from dataclasses import asdict
from pathlib import Path

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
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.service import (
    AutomotiveProductIntelligence,
)
from buzzard_ai_complete.automotive_taxonomy_maximal.automotive_taxonomy.validation.validator import (
    AutomotiveTaxonomyValidator,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class AutomotiveTaxonomyService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "automotive_taxonomy.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "automotive_taxonomy.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        rules = config.get("rules", {})
        return {
            "service": "automotive-taxonomy-maximal",
            "status": "maximal_automotive_taxonomy_ready",
            "principle": config.get("principle", "vehicle_need_first"),
            "levels": len(config.get("levels", [])),
            "master_systems": len(MASTER_SYSTEMS),
            "fitment_requires_evidence": rules.get("fitment_requires_evidence", True),
            "automatic_fitment_publish": rules.get("automatic_fitment_publish", False),
            "live_activation": False,
        }

    def build_demo_taxonomy(self):
        nodes = [
            TaxonomyNode("auto", "Otomotiv", 1),
            TaxonomyNode("brakes", "Fren Sistemi", 2, "auto"),
            TaxonomyNode("pads", "Fren Balataları", 3, "brakes"),
            TaxonomyNode("front-pads", "Ön Fren Balataları", 4, "pads"),
        ]
        return AutomotiveTaxonomy(nodes=nodes)

    def master_seed(self):
        return [{"id": item[0], "name": item[1]} for item in MASTER_SYSTEMS]

    def demo_flow(self):
        taxonomy = self.build_demo_taxonomy()
        vehicle = VehicleProfile("v1", "BMW", "320d", year_from=2018, year_to=2020, engine_code="B47")
        vehicles = [vehicle]
        intelligence = AutomotiveProductIntelligence(taxonomy, vehicles)
        fitment = FitmentEngine(taxonomy)
        fitment.add_rule(
            FitmentRule("p1", "v1", "front", "front", "B47", "verified", "source", 0.95)
        )
        return {
            "health": self.health(),
            "master_system_count": len(MASTER_SYSTEMS),
            "demo_path": intelligence.product_path("front-pads"),
            "vehicle_matches": [
                asdict(v) for v in VehicleSelector(vehicles).select(make="BMW", model="320d", year=2019, engine_code="B47")
            ],
            "fitment_matches": [fitment.explain(rule) for rule in fitment.find(vehicle, "p1", "front")],
            "validation_errors": AutomotiveTaxonomyValidator().validate(taxonomy),
            "parts_for_vehicle": intelligence.find_parts_for_vehicle(
                {"make": "BMW", "model": "320d", "year": 2019, "engine_code": "B47"},
                category="fren",
            ),
        }
