import json
from pathlib import Path

from buzzard_ai_complete.category_audit_maximal.category_audit.engine import (
    CategoryAuditEngine,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DATA_DIR = Path(__file__).resolve().parent / "data"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
WORKSPACE_ROOT = Path(__file__).resolve().parents[3]
STOREFRONT_CATALOG_PATH = WORKSPACE_ROOT / "data" / "buzzard_categories.json"
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
        rows = self.engine().audit()
        main_rows = [row for row in rows if row.get("kind") != "migration_item"]
        migration_rows = [row for row in rows if row.get("kind") == "migration_item"]
        return {
            "summary": self.engine().summary(),
            "categories": main_rows,
            "migration_items": migration_rows,
        }

    def sync_live_from_storefront(self):
        catalog = json.loads(STOREFRONT_CATALOG_PATH.read_text(encoding="utf-8"))
        mains = sorted(
            [category for category in catalog["categories"] if category.get("level") == 1],
            key=lambda row: row["menu_order"],
        )
        automotive = next(category for category in mains if category["name"] == "Automotive")
        reifen = next(
            child for child in automotive["children"] if child["name"] == "Reifen & Felgen"
        )
        payload = {
            "status": "FULL_INPUT",
            "source": "data/buzzard_categories.json",
            "main_category_count": len(mains),
            "categories": [
                {
                    "id": category["id"],
                    "name": category["name"],
                    "slug": category["slug"],
                    "menu_order": category["menu_order"],
                    "url": category["url"],
                    "level": 1,
                }
                for category in mains
            ],
            "migration_items": [
                {
                    "id": reifen["id"],
                    "name": reifen["name"],
                    "slug": reifen["slug"],
                    "parent": automotive["name"],
                    "parent_id": automotive["id"],
                    "level": 2,
                    "url": reifen["url"],
                }
            ],
        }
        live_path = DATA_DIR / "live_categories_INPUT.json"
        live_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        preview_path = DATA_DIR / "AUDIT_PREVIEW.json"
        self._engine = None
        preview_path.write_text(
            json.dumps(self.engine().audit(), ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return {
            "status": payload["status"],
            "main_category_count": payload["main_category_count"],
            "migration_items": len(payload["migration_items"]),
            "summary": self.engine().summary(),
        }

    def demo_flow(self):
        engine = self.engine()
        report = self.audit_report()
        return {
            "health": self.health(),
            "integrity": engine.validate(),
            "policy_rules": len(self.load_policy()),
            "summary": report["summary"],
            "sample_results": report["categories"][:5],
            "special_cases": {
                "reifen_felgen": next(
                    row for row in report["migration_items"] if row["name"] == "Reifen & Felgen"
                ),
                "energie_solar": next(
                    row for row in report["categories"] if row["name"] == "Energie & Solar"
                ),
                "textil": next(row for row in report["categories"] if row["name"] == "Textil"),
            },
            "review_queue": [row for row in report["categories"] if row["action"] == "REVIEW"],
            "preview_matches_input": self.load_preview() == engine.audit(),
        }
