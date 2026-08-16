import json
from pathlib import Path

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import Category
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.store import (
    CategoryIntelligence47Store,
)

CONFIG_DIR = Path(__file__).resolve().parent / "config"
DOCS_DIR = Path(__file__).resolve().parent / "docs"
REPO_ROOT = Path(__file__).resolve().parents[3]


class CategoryIntelligence47Service:
    def __init__(self):
        config = self.load_config()
        db_path = config.get("db_path")
        if db_path and not Path(db_path).is_absolute():
            db_path = REPO_ROOT / db_path
        self.store = CategoryIntelligence47Store(db_path)

    def _repo_path(self, relative: str) -> Path:
        return REPO_ROOT / relative

    def load_config(self) -> dict:
        return json.loads((CONFIG_DIR / "category_intelligence_47.production.json").read_text(encoding="utf-8"))

    def health(self) -> dict:
        config = self.load_config()
        monitoring = config.get("monitoring", {})
        return {
            "service": "category-intelligence-47-maximal",
            "status": "category_intelligence_47_ready",
            "scope": "47 non-Kfz categories",
            "target_categories": config.get("category_count", 47),
            "target_competitors": config.get("target_competitors", 940),
            "evidence_required": monitoring.get("evidence_required", True),
            "public_sources_only": monitoring.get("public_sources_only", True),
            "console_html": "/taxonomy/buzzard_47_category_intelligence_os.html",
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "live_activation": False,
        }

    def summary(self) -> dict:
        payload = self.store.summary()
        payload.update(
            {
                "scope": "47 non-Kfz categories",
                "target_competitors": self.load_config().get("target_competitors", 940),
                "evidence_required": True,
            }
        )
        return payload

    def category_definitions(self) -> list[dict]:
        return self.load_config().get("categories", [])

    def seed_categories(self) -> dict:
        rows = [
            Category(
                code=item["code"],
                name=item["name"],
                parent_id=item.get("parent_id"),
                level=item.get("level", 1),
                source=item.get("source", "master_taxonomy"),
            )
            for item in self.category_definitions()
        ]
        return self.store.import_categories(rows)

    def intelligence_os_summary(self) -> dict:
        config = self.load_config()
        manifest_path = self._repo_path(config["intelligence_os_json_path"])
        manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {}
        html_path = self._repo_path(config["intelligence_os_html_path"])
        return {
            "name": manifest.get("name", "Buzzard 47 Category Intelligence OS"),
            "version": manifest.get("version", config.get("version", "1.0")),
            "category_count": config.get("category_count", 47),
            "target_competitors": config.get("target_competitors", 940),
            "console_html": "/taxonomy/buzzard_47_category_intelligence_os.html",
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "html_exists": html_path.is_file(),
            "html_bytes": html_path.stat().st_size if html_path.is_file() else 0,
            "db_summary": self.summary(),
        }

    def load_manifest(self) -> dict:
        config = self.load_config()
        path = self._repo_path(config["intelligence_os_json_path"])
        return json.loads(path.read_text(encoding="utf-8"))

    def demo_flow(self) -> dict:
        seeded = self.seed_categories()
        categories = self.store.list_categories()
        sample = categories[0] if categories else None
        analysis = self.store.analyze(sample["id"]) if sample else None
        return {
            "health": self.health(),
            "seed": seeded,
            "category_count": len(categories),
            "sample_category": sample,
            "sample_analysis": analysis,
        }
