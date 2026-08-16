import json
from pathlib import Path

from buzzard_ai_complete.category_audit_maximal.category_audit.engine import (
    CategoryAuditEngine,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
MASTER_TAXONOMY_PATH = (
    Path(__file__).resolve().parents[1]
    / "master_taxonomy_48_maximal"
    / "data"
    / "taxonomy.json"
)


class CategoryAuditService:
    def __init__(self):
        self._engine = None

    def engine(self):
        if self._engine is None:
            self._engine = CategoryAuditEngine(
                MASTER_TAXONOMY_PATH,
                DATA_DIR / "live_categories_INPUT.json",
                DATA_DIR / "audit_policy.json",
            )
        return self._engine

    def load_config(self):
        return json.loads(
            (CONFIG_DIR / "category_audit.production.json").read_text(encoding="utf-8")
        )

    def load_policy(self):
        return json.loads((DATA_DIR / "audit_policy.json").read_text(encoding="utf-8"))

    def load_live_categories(self):
        return json.loads(
            (DATA_DIR / "live_categories_INPUT.json").read_text(encoding="utf-8")
        )

    def load_preview(self):
        return json.loads((DATA_DIR / "AUDIT_PREVIEW.json").read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        live = self.load_live_categories()
        summary = self.engine().summary()
        return {
            "service": "category-audit-maximal",
            "status": "category_audit_ready",
            "package": config.get("name"),
            "version": config.get("version"),
            "schema": config.get("schema"),
            "master_taxonomy_ref": config.get("master_taxonomy_ref"),
            "live_input_status": live.get("status", config.get("live_input_status")),
            "allowed_actions": config.get("actions", []),
            "delete_enabled": config.get("delete_enabled", False),
            "summary": summary,
            "live_activation": False,
            "BUZZARD_SALES_ENABLED": 0,
        }

    def audit_report(self):
        return {
            "summary": self.engine().summary(),
            "categories": self.engine().audit(),
        }

    def demo_flow(self):
        engine = self.engine()
        report = engine.audit()
        return {
            "health": self.health(),
            "integrity": engine.validate(),
            "policy_rules": len(self.load_policy()),
            "sample_results": report[:5],
            "special_cases": {
                "reifen_felgen": next(x for x in report if x["name"] == "Reifen & Felgen"),
                "landwirtschaft": next(
                    x for x in report if x["name"] == "Landwirtschaft & Agrartechnik"
                ),
                "baumaschinen": next(
                    x for x in report if x["name"] == "Baumaschinen & Ersatzteile"
                ),
            },
            "preview_matches_input": self.load_preview() == report,
        }
