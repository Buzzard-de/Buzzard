import json
from dataclasses import asdict
from pathlib import Path

from buzzard_ai_complete.livestock_maximal.livestock.catalog import LivestockCatalog
from buzzard_ai_complete.livestock_maximal.livestock.equipment.fitment import (
    LivestockEquipmentFitment,
)
from buzzard_ai_complete.livestock_maximal.livestock.farm_systems import (
    ANIMAL_TYPES,
    FARM_SYSTEMS,
)
from buzzard_ai_complete.livestock_maximal.livestock.intelligence.gaps import (
    LivestockGapDetector,
)
from buzzard_ai_complete.livestock_maximal.livestock.intelligence.opportunity import (
    LivestockOpportunity,
)
from buzzard_ai_complete.livestock_maximal.livestock.models import (
    EquipmentFitment,
    FarmEquipmentProfile,
)
from buzzard_ai_complete.livestock_maximal.livestock.taxonomy.master import (
    LIVESTOCK_TAXONOMY,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class LivestockService:
    def load_config(self):
        return json.loads((CONFIG_DIR / "livestock.production.json").read_text(encoding="utf-8"))

    def load_schema(self):
        return json.loads((SCHEMA_DIR / "livestock.schema.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        rules = config.get("rules", {})
        return {
            "service": "livestock-maximal",
            "status": "maximal_livestock_ready",
            "main_category": config.get("name", "Hayvancılık"),
            "principle": config.get("principle", "animal_need_first"),
            "animal_groups": len(config.get("animal_groups", [])),
            "system_groups": len(config.get("system_groups", [])),
            "taxonomy_nodes": len(LIVESTOCK_TAXONOMY),
            "farm_systems": len(FARM_SYSTEMS),
            "animal_types": len(ANIMAL_TYPES),
            "source_backed_equipment_fitment": rules.get("source_backed_equipment_fitment", True),
            "category_gap_detection": rules.get("category_gap_detection", True),
            "live_activation": False,
        }

    def list_branches(self):
        return [
            {"id": key, "name": value["name"]}
            for key, value in LIVESTOCK_TAXONOMY.items()
        ]

    def demo_flow(self):
        catalog = LivestockCatalog(LIVESTOCK_TAXONOMY)
        profile = FarmEquipmentProfile(
            "e1",
            "milking",
            make="DeLaval",
            model="VMS",
            year_from=2018,
            year_to=2024,
            capacity="4x",
        )
        fitment = LivestockEquipmentFitment(
            profiles=[profile],
            fitments=[
                EquipmentFitment(
                    "p1",
                    "e1",
                    position="vacuum",
                    source="verified",
                    confidence=0.93,
                )
            ],
        )
        opportunity = LivestockOpportunity()
        score = opportunity.score(90, 80, 85, 75, 70, 10)
        gaps = LivestockGapDetector().compare(
            ["cattle", "milking", "feeding"],
            ["cattle", "milking", "feeding", "robotics"],
        )
        return {
            "health": self.health(),
            "branches": self.list_branches(),
            "catalog": {
                "cattle_subcategories": list(catalog.subcategories("cattle").keys()),
                "cattle_dairy_needs": catalog.sub_subcategories("cattle", "dairy"),
                "search_vacuum": catalog.search("vakum"),
            },
            "fitment": {
                "equipment": [
                    asdict(e) for e in fitment.find_equipment(equipment_type="milking", make="DeLaval")
                ],
                "parts": [asdict(p) for p in fitment.compatible_parts("e1")],
            },
            "opportunity": {"score": score, "priority": opportunity.priority(score)},
            "gaps": gaps,
            "farm_systems": FARM_SYSTEMS,
            "animal_types": ANIMAL_TYPES,
        }
