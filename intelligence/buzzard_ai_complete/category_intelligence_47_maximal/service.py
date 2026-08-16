import json
from pathlib import Path

from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.evidence import (
    CategoryIntelligence47EvidenceLayer,
)
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.models import (
    Category,
    EvidenceIn,
    ReviewIn,
)
from buzzard_ai_complete.category_intelligence_47_maximal.category_intelligence_os.research import (
    CategoryIntelligence47ResearchLayer,
)
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
        matrix_path = config.get("research_matrix_json_path", "data/taxonomy/buzzard_47_research_matrix_max.json")
        if matrix_path and not Path(matrix_path).is_absolute():
            matrix_path = REPO_ROOT / matrix_path
        self.research = CategoryIntelligence47ResearchLayer(self.store, Path(matrix_path))
        self.evidence = CategoryIntelligence47EvidenceLayer(self.store)

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
            "final_console_html": "/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html",
            "max_final_console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html",
            "primary_console_html": "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html",
            "max_single_final_console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html",
            "final_max_console_html": "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html",
            "final_manifest_json": "/taxonomy/buzzard_final_47_category_intelligence_manifest.json",
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
            "final_console_html": "/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html",
            "max_final_console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html",
            "primary_console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html",
            "max_single_final_console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html",
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "html_exists": html_path.is_file(),
            "html_bytes": html_path.stat().st_size if html_path.is_file() else 0,
            "db_summary": self.summary(),
        }

    def load_manifest(self) -> dict:
        config = self.load_config()
        path = self._repo_path(config["intelligence_os_json_path"])
        return json.loads(path.read_text(encoding="utf-8"))

    def load_final_manifest(self) -> dict:
        config = self.load_config()
        path = self._repo_path(config["final_manifest_json_path"])
        return json.loads(path.read_text(encoding="utf-8"))

    def final_manifest_summary(self) -> dict:
        final_manifest = self.load_final_manifest()
        manifest = self.load_manifest()
        return {
            **final_manifest,
            "primary_console_html": manifest.get(
                "primary_console_html",
                "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html",
            ),
            "research_matrix_json": manifest.get(
                "research_matrix_json",
                "/taxonomy/buzzard_47_research_matrix_max.json",
            ),
            "api_prefix": manifest.get("api_prefix", "/category-intelligence-47"),
            "runtime_manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
        }

    def final_100_single_file_summary(self) -> dict:
        config = self.load_config()
        manifest = self.load_manifest()
        html_path = self._repo_path(config["intelligence_os_final_100_single_file_html_path"])
        return {
            "name": manifest.get("name", "Buzzard 47 Category Intelligence OS"),
            "version": manifest.get("version", "1.0-final-100"),
            "category_count": config.get("category_count", 47),
            "target_competitors": config.get("target_competitors", 940),
            "console_html": "/taxonomy/buzzard_47_category_intelligence_os_final_100_single_file.html",
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "finalization": manifest.get("finalization", {}),
            "html_exists": html_path.is_file(),
            "html_bytes": html_path.stat().st_size if html_path.is_file() else 0,
        }

    def max_final_single_file_summary(self) -> dict:
        config = self.load_config()
        manifest = self.load_manifest()
        html_path = self._repo_path(config["intelligence_os_max_final_single_file_html_path"])
        return {
            "name": manifest.get("engine", {}).get("name", "Buzzard 47 Category Intelligence OS — MAX FINAL"),
            "version": manifest.get("version", "1.0-max-final"),
            "category_count": config.get("category_count", 47),
            "target_competitors": config.get("target_competitors", 940),
            "console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_final_single_file.html",
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "engine": manifest.get("engine", {}),
            "finalization": manifest.get("finalization", {}),
            "html_exists": html_path.is_file(),
            "html_bytes": html_path.stat().st_size if html_path.is_file() else 0,
        }

    def final_max_single_file_summary(self) -> dict:
        config = self.load_config()
        manifest = self.load_manifest()
        html_path = self._repo_path(config["intelligence_os_final_max_single_file_html_path"])
        primary = manifest.get(
            "primary_console_html",
            "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html",
        )
        return {
            "name": manifest.get("engine", {}).get(
                "name", "Buzzard 47 Category Intelligence OS — FINAL MAX"
            ),
            "version": manifest.get("version", "1.0-final-max"),
            "category_count": config.get("category_count", 47),
            "target_competitors": config.get("target_competitors", 940),
            "console_html": "/taxonomy/buzzard_final_47_category_intelligence_os_max_single_file.html",
            "primary_console_html": primary,
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "engine": manifest.get("engine", {}),
            "finalization": manifest.get("finalization", {}),
            "orchestration": manifest.get("orchestration", {}),
            "html_exists": html_path.is_file(),
            "html_bytes": html_path.stat().st_size if html_path.is_file() else 0,
        }

    def max_single_final_single_file_summary(self) -> dict:
        config = self.load_config()
        manifest = self.load_manifest()
        html_path = self._repo_path(config["intelligence_os_max_single_final_single_file_html_path"])
        return {
            "name": manifest.get("engine", {}).get("name", "Buzzard 47 Category Intelligence OS — MAX SINGLE FINAL"),
            "version": manifest.get("version", "1.0-max-single-final"),
            "category_count": config.get("category_count", 47),
            "target_competitors": config.get("target_competitors", 940),
            "console_html": "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html",
            "primary_console_html": manifest.get(
                "primary_console_html",
                "/taxonomy/buzzard_47_category_intelligence_os_max_single_final_single_file.html",
            ),
            "manifest_json": "/taxonomy/buzzard_47_category_intelligence_os.json",
            "engine": manifest.get("engine", {}),
            "finalization": manifest.get("finalization", {}),
            "html_exists": html_path.is_file(),
            "html_bytes": html_path.stat().st_size if html_path.is_file() else 0,
        }

    def research_matrix(self) -> dict:
        return self.research.load_matrix()

    def import_research_matrix(self) -> dict:
        return self.research.import_candidate_matrix()

    def add_evidence(self, payload: EvidenceIn) -> dict:
        return self.evidence.add_evidence(payload)

    def review_evidence(self, payload: ReviewIn) -> dict:
        return self.evidence.review_evidence(payload)

    def verify_competitor(self, competitor_id: int, reviewer: str = "authorized-reviewer") -> dict:
        return self.evidence.verify_competitor(competitor_id, reviewer)

    def list_competitor_evidence(self, competitor_id: int) -> list[dict]:
        return self.evidence.list_competitor_evidence(competitor_id)

    def verification_dashboard(self) -> dict:
        return self.evidence.verification_dashboard()

    def score_category(self, category_id: int) -> dict:
        return self.evidence.score_category(category_id)

    def executive_report(self) -> dict:
        return self.evidence.executive_report()

    def export_competitors(self) -> dict:
        return self.evidence.export_competitors()

    def export_taxonomy(self) -> dict:
        return self.evidence.export_taxonomy()

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
