import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.agriculture_maximal.agriculture.compatibility.engine import (
    AgriculturalFitmentEngine,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.intelligence.gaps import (
    AgricultureGapDetector,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.intelligence.market import (
    AgricultureMarketSignals,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.models import (
    MachineProfile,
    PartFitment,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.service.catalog import (
    AgricultureCatalogService,
)
from buzzard_ai_complete.agriculture_maximal.agriculture.taxonomy.master import (
    AGRICULTURE_TAXONOMY,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class AgricultureService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "agriculture.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "agriculture.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        rules = config.get("rules", {})
        return {
            "service": "agriculture-maximal",
            "status": "maximal_agriculture_ready",
            "main_category": config.get("name", "Tarım & Tarım Makineleri"),
            "branches": len(config.get("branches", [])),
            "taxonomy_nodes": len(AGRICULTURE_TAXONOMY),
            "fitment_requires_evidence": rules.get("fitment_requires_evidence", True),
            "category_gap_detection": rules.get("category_gap_detection", True),
            "live_activation": False,
        }

    def list_branches(self):
        return [
            {"id": key, "name": value["name"]}
            for key, value in AGRICULTURE_TAXONOMY.items()
        ]

    def demo_flow(self):
        catalog = AgricultureCatalogService(AGRICULTURE_TAXONOMY)
        machine = MachineProfile(
            "m1",
            "tractor",
            "John Deere",
            "6130M",
            year_from=2018,
            year_to=2022,
            engine_code="PowerTech",
        )
        fitment = AgriculturalFitmentEngine(
            machines=[machine],
            fitments=[
                PartFitment(
                    "p1",
                    "m1",
                    system="engine",
                    position="front",
                    source="verified",
                    confidence=0.92,
                )
            ],
        )
        market = AgricultureMarketSignals()
        score = market.score(90, 60, 80, 85, 10)
        gaps = AgricultureGapDetector().compare_taxonomies(
            ["tractor", "spare_parts", "irrigation"],
            ["tractor", "spare_parts", "irrigation", "drones"],
        )
        return {
            "health": self.health(),
            "branches": self.list_branches(),
            "catalog": {
                "tractor_subcategories": list(catalog.list_subcategories("tractor").keys()),
                "tractor_standard_parts": catalog.list_sub_subcategories("tractor", "standard"),
                "search_engine": catalog.find_category("piston"),
            },
            "fitment": {
                "machines": [
                    asdict(m)
                    for m in fitment.select_machine(
                        machine_type="tractor", make="John Deere", model="6130M", year=2020
                    )
                ],
                "parts": [
                    asdict(p) for p in fitment.compatible_parts("m1", system="engine")
                ],
            },
            "market": {"score": score, "priority": market.priority(score)},
            "gaps": gaps,
        }
