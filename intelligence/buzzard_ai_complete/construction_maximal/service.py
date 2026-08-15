import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.construction_maximal.construction.catalog import ConstructionCatalog
from buzzard_ai_complete.construction_maximal.construction.compatibility.engine import (
    ConstructionFitmentEngine,
)
from buzzard_ai_complete.construction_maximal.construction.intelligence.gaps import (
    ConstructionGapDetector,
)
from buzzard_ai_complete.construction_maximal.construction.intelligence.market import (
    ConstructionMarketIntelligence,
    ConstructionMarketSignals,
)
from buzzard_ai_complete.construction_maximal.construction.models import (
    ConstructionMachine,
    ConstructionPart,
    MachineProfile,
    PartFitment,
)
from buzzard_ai_complete.construction_maximal.construction.service.intelligence import (
    ConstructionIntelligence,
)
from buzzard_ai_complete.construction_maximal.construction.taxonomy.master import (
    CONSTRUCTION_TAXONOMY,
    TAXONOMY_LEVELS,
    TAXONOMY_MAIN_CATEGORY,
    TAXONOMY_PRINCIPLE,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
DATA_DIR = Path(__file__).resolve().parent / "data"


class ConstructionService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "construction.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "construction.schema.json").read_text(encoding="utf-8"))

    def load_taxonomy(self):
        return json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        rules = config.get("rules", {})
        return {
            "service": "construction-maximal",
            "status": "maximal_construction_ready",
            "main_category": TAXONOMY_MAIN_CATEGORY,
            "principle": TAXONOMY_PRINCIPLE,
            "levels": len(TAXONOMY_LEVELS),
            "branches": len(config.get("branches", [])),
            "taxonomy_nodes": len(CONSTRUCTION_TAXONOMY),
            "fitment_requires_evidence": rules.get("fitment_requires_evidence", True),
            "category_gap_detection": rules.get("category_gap_detection", True),
            "live_activation": False,
        }

    def list_branches(self):
        return [
            {"id": key, "name": value["name"]}
            for key, value in CONSTRUCTION_TAXONOMY.items()
        ]

    def demo_flow(self):
        catalog = ConstructionCatalog(CONSTRUCTION_TAXONOMY)
        machine = MachineProfile(
            "m1",
            "earthmoving",
            make="Caterpillar",
            model="320",
            year_from=2016,
            year_to=2022,
            system="hydraulic",
        )
        fitment = ConstructionFitmentEngine(
            machines=[machine],
            fitments=[
                PartFitment(
                    "p1",
                    "m1",
                    position="hydraulic",
                    source="verified",
                    confidence=0.91,
                )
            ],
        )
        match_machine = ConstructionMachine(
            "m1",
            "earthmoving",
            make="Caterpillar",
            model="320",
            year_from=2016,
            year_to=2022,
            engine_code="C7.1",
        )
        match_part = ConstructionPart(
            "p1",
            "Hidrolik Pompa",
            "machine_parts/hydraulic",
            attributes={
                "machine_type": "earthmoving",
                "make": "Caterpillar",
                "model": "320",
                "engine_code": "C7.1",
            },
            source="verified",
        )
        match_result = fitment.match(match_machine, match_part)
        market = ConstructionMarketIntelligence()
        score = market.score(88, 70, 82, 78, 65, 12)
        gaps = ConstructionGapDetector().compare(
            ["earthmoving", "concrete", "lifting"],
            ["earthmoving", "concrete", "lifting", "demolition_robotics"],
        )
        opportunity = ConstructionIntelligence().product_opportunity(
            product={"id": match_part.product_id, "name": match_part.name},
            market_signal={"score": score, "priority": market.priority(score)},
        )
        return {
            "health": self.health(),
            "branches": self.list_branches(),
            "catalog": {
                "categories": len(catalog.categories()),
                "earthmoving_types": catalog.sub_subcategories("earthmoving"),
                "search_excavator": catalog.search("eks"),
                "machine_parts_count": len(catalog.sub_subcategories("machine_parts")),
            },
            "fitment": {
                "machines": [
                    asdict(m)
                    for m in fitment.select_machine(
                        machine_type="earthmoving", make="Caterpillar", model="320", year=2020
                    )
                ],
                "parts": [asdict(p) for p in fitment.compatible_parts("m1", system="hydraulic")],
                "match": asdict(match_result),
            },
            "market": {"score": score, "priority": market.priority(score)},
            "gaps": gaps,
            "opportunity": opportunity,
        }
