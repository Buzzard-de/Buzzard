import json
from pathlib import Path

from buzzard_ai_complete.smart_menu_48_maximal.smart_menu.engine import SmartMegaMenuEngine

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
UI_DIR = Path(__file__).resolve().parent / "ui"


class SmartMenu48Service:
    def __init__(self):
        self._engine = None

    def engine(self):
        if self._engine is None:
            self._engine = SmartMegaMenuEngine()
        return self._engine

    def load_config(self):
        return json.loads(
            (CONFIG_DIR / "smart_menu_48.production.json").read_text(encoding="utf-8")
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
        signals = self.engine().signal_counts()
        return {
            "service": "smart-menu-48-maximal",
            "status": "smart_menu_48_ready",
            "package": config.get("name"),
            "version": config.get("version"),
            "schema": config.get("schema"),
            "main_categories": counts["main_categories"],
            "subcategories": counts["subcategories"],
            "sub_subcategories": counts["sub_subcategories"],
            "total_nodes": counts["total_nodes"],
            "merchandising_signals": config.get("rules", {}).get("merchandising_signals", "demo"),
            "signal_counts": signals,
            "ui_assets": self.ui_assets(),
            "live_activation": False,
            "BUZZARD_SALES_ENABLED": 0,
        }

    def demo_flow(self):
        engine = self.engine()
        sample = engine.get_subcategory("bz.01.01")
        signals = engine.get_signals("bz.01.01")
        return {
            "health": self.health(),
            "integrity": engine.validate(),
            "counts": engine.counts(),
            "signal_counts": engine.signal_counts(),
            "sample_subcategory": {
                "id": sample["sub"]["id"],
                "name": sample["sub"]["name"],
                "signals": signals,
            },
            "search_motor": engine.search("motor", limit=3),
            "integration_doc": (DOCS_DIR / "INTEGRATION.md").exists(),
        }
