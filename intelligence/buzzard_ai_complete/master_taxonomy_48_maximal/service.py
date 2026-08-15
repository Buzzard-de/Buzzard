import json
from pathlib import Path

from buzzard_ai_complete.master_taxonomy_48_maximal.master_taxonomy.engine import (
    BuzzardMasterTaxonomy,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
DOCS_DIR = Path(__file__).resolve().parent / "docs"


class MasterTaxonomy48Service:
    def __init__(self):
        self._taxonomy = None

    def taxonomy(self):
        if self._taxonomy is None:
            self._taxonomy = BuzzardMasterTaxonomy()
        return self._taxonomy

    def load_config(self):
        return json.loads(
            (CONFIG_DIR / "master_taxonomy_48.production.json").read_text(encoding="utf-8")
        )

    def load_counts(self):
        return json.loads((DATA_DIR / "COUNTS.json").read_text(encoding="utf-8"))

    def load_taxonomy(self):
        return json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))

    def list_main_categories(self):
        return [n for n in self.taxonomy().nodes if n["level"] == 1]

    def health(self):
        config = self.load_config()
        counts = self.taxonomy().counts()
        return {
            "service": "master-taxonomy-48-maximal",
            "status": "master_taxonomy_48_ready",
            "package": config.get("name"),
            "version": config.get("version"),
            "schema": config.get("schema"),
            "main_categories": counts["main_categories"],
            "subcategories": counts["subcategories"],
            "sub_subcategories": counts["sub_subcategories"],
            "total_nodes": counts["total_nodes"],
            "fitment_requires_evidence": config.get("rules", {}).get(
                "fitment_requires_evidence", True
            ),
            "category_gap_detection": config.get("rules", {}).get(
                "category_gap_detection", True
            ),
            "live_activation": False,
            "BUZZARD_SALES_ENABLED": 0,
        }

    def demo_flow(self):
        taxonomy = self.taxonomy()
        counts = self.load_counts()
        tire_children = taxonomy.children("bz.44")
        search_hits = {
            "Lastikler – Tüm Motorlu Araçlar": len(
                taxonomy.search("Lastikler – Tüm Motorlu Araçlar")
            ),
            "Tarım & Tarım Makineleri": len(taxonomy.search("Tarım & Tarım Makineleri")),
            "Hayvancılık": len(taxonomy.search("Hayvancılık")),
            "Güneş & Rüzgâr Enerjisi": len(taxonomy.search("Güneş & Rüzgâr Enerjisi")),
            "İnşaat & İnşaat Makineleri": len(
                taxonomy.search("İnşaat & İnşaat Makineleri")
            ),
        }
        return {
            "health": self.health(),
            "counts": counts,
            "integrity": taxonomy.validate(),
            "new_five_categories": search_hits,
            "tire_children": len(tire_children),
            "sample_main_categories": [
                {"id": n["id"], "name": n["name"]} for n in self.list_main_categories()[:5]
            ],
        }
