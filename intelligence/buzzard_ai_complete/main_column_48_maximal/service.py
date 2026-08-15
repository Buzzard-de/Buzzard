import json
from pathlib import Path

from buzzard_ai_complete.main_column_48_maximal.main_column.engine import (
    MainColumnCategoryEngine,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
UI_DIR = Path(__file__).resolve().parent / "ui"


class MainColumn48Service:
    def __init__(self):
        self._engine = None

    def engine(self):
        if self._engine is None:
            self._engine = MainColumnCategoryEngine()
        return self._engine

    def load_config(self):
        return json.loads(
            (CONFIG_DIR / "main_column_48.production.json").read_text(encoding="utf-8")
        )

    def load_taxonomy(self):
        return json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))

    def ui_assets(self):
        return {
            "demo_html": str(UI_DIR / "index.html"),
            "react_component": str(UI_DIR / "BuzzardCategoryMainColumn.jsx"),
            "taxonomy_json": str(DATA_DIR / "taxonomy.json"),
        }

    def health(self):
        config = self.load_config()
        counts = self.engine().counts()
        return {
            "service": "main-column-48-maximal",
            "status": "main_column_48_ready",
            "package": config.get("name"),
            "version": config.get("version"),
            "schema": config.get("schema"),
            "main_categories": counts["main_categories"],
            "subcategories": counts["subcategories"],
            "sub_subcategories": counts["sub_subcategories"],
            "total_nodes": counts["total_nodes"],
            "data_driven_ui": config.get("rules", {}).get("data_driven_ui", True),
            "ui_assets": self.ui_assets(),
            "live_activation": False,
            "BUZZARD_SALES_ENABLED": 0,
        }

    def demo_flow(self):
        engine = self.engine()
        sample_main = engine.get_main("bz.44")
        search_hits = engine.search("vinç", limit=5)
        return {
            "health": self.health(),
            "integrity": engine.validate(),
            "counts": engine.counts(),
            "sample_main_categories": engine.main_categories()[:5],
            "tire_category": {
                "id": sample_main["id"],
                "name": sample_main["name"],
                "subcategories": len(sample_main["children"]),
            },
            "search_vinç": search_hits,
            "integration_doc": (DOCS_DIR / "INTEGRATION.md").exists(),
        }
