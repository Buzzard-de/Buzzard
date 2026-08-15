import json
from pathlib import Path

from buzzard_ai_complete.agriculture_maximal.service import AgricultureService
from buzzard_ai_complete.automotive_taxonomy_maximal.service import AutomotiveTaxonomyService
from buzzard_ai_complete.livestock_maximal.service import LivestockService

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class MasterTaxonomyCleanService:
    def load_manifest(self):
        return json.loads((CONFIG_DIR / "manifest.json").read_text(encoding="utf-8"))

    def load_sales_defaults(self):
        return json.loads(
            (CONFIG_DIR / "sales_activation_defaults.json").read_text(encoding="utf-8")
        )

    def health(self):
        manifest = self.load_manifest()
        sales = self.load_sales_defaults()
        automotive = AutomotiveTaxonomyService().health()
        agriculture = AgricultureService().health()
        livestock = LivestockService().health()
        return {
            "service": "master-taxonomy-clean-maximal",
            "status": "master_taxonomy_clean_ready",
            "package": manifest.get("package"),
            "version": manifest.get("version"),
            "modules": manifest.get("modules", []),
            "domains": {
                "automotive_tires": automotive,
                "agriculture": agriculture,
                "livestock": livestock,
            },
            "sales_activation": sales.get("BUZZARD_SALES_ENABLED", 0) == 0 and not sales.get("live_activation", True),
            "live_activation": False,
            "require_source_for_fitment": sales.get("require_source_for_fitment", True),
            "human_review_on_conflict": sales.get("human_review_on_conflict", True),
        }

    def demo_flow(self):
        automotive = AutomotiveTaxonomyService()
        agriculture = AgricultureService()
        livestock = LivestockService()
        return {
            "health": self.health(),
            "manifest": self.load_manifest(),
            "sales_defaults": self.load_sales_defaults(),
            "automotive_tires": {
                "health": automotive.health(),
                "tires_vehicle_types": len(automotive.tires_categories()),
            },
            "agriculture": {
                "health": agriculture.health(),
                "branches": len(agriculture.list_branches()),
            },
            "livestock": {
                "health": livestock.health(),
                "branches": len(livestock.list_branches()),
            },
        }
