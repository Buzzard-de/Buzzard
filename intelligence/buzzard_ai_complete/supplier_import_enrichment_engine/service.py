import json
from pathlib import Path

from buzzard_ai_complete.supplier_import_enrichment_engine.connectors.feed_adapters import read_json
from buzzard_ai_complete.supplier_import_enrichment_engine.engine.pipeline import ImportEngine

DATA_DIR = Path(__file__).resolve().parent / "data"
SCHEMA_DIR = Path(__file__).resolve().parent / "schemas"
DEMO_FEED = DATA_DIR / "demo_supplier_feed.json"
CONFIG_JSON = DATA_DIR / "import_engine_config.json"


class SupplierImportEnrichmentService:
    def load_config(self):
        return json.loads(CONFIG_JSON.read_text(encoding="utf-8"))

    def health(self):
        config = self.load_config()
        taxonomy = json.loads((DATA_DIR / "taxonomy.json").read_text(encoding="utf-8"))
        roots = [node for node in taxonomy["nodes"] if node["level"] == 1]
        return {
            "service": "supplier-import-enrichment",
            "status": "ready",
            "dry_run_default": config.get("dry_run_default", True),
            "pipeline_steps": len(config.get("pipeline", [])),
            "canonical_main_categories": len(roots),
            "sources": config.get("sources", []),
        }

    def decision_schema(self):
        return json.loads((SCHEMA_DIR / "decision.schema.json").read_text(encoding="utf-8"))

    def normalized_record_schema(self):
        return json.loads((SCHEMA_DIR / "normalized_supplier_record.json").read_text(encoding="utf-8"))

    def preview(self, supplier_id, records, dry_run=True):
        return ImportEngine(supplier_id, dry_run=dry_run).process(records)

    def demo_flow(self):
        records = read_json(DEMO_FEED)
        result = self.preview("demo-supplier", records, dry_run=True)
        return {
            "health": self.health(),
            "demo_records": len(records),
            "preview": result,
        }
