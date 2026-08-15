import csv
import json
from pathlib import Path

from buzzard_ai_complete.pim_product_master.db import count_products, create_product
from buzzard_ai_complete.pim_product_master.import_pipeline import process
from buzzard_ai_complete.pim_product_master.quality import validate_product

DATA_DIR = Path(__file__).resolve().parent / "data"
TAXONOMY_JSON = DATA_DIR / "taxonomy.json"
TEMPLATE_CSV = DATA_DIR / "product_import_template.csv"
SCHEMA_JSON = Path(__file__).resolve().parent / "schemas" / "product_master.json"
SUPPLIER_SCHEMA_JSON = Path(__file__).resolve().parent / "schemas" / "supplier_import.json"


class PimProductMasterService:
    def load_taxonomy(self):
        return json.loads(TAXONOMY_JSON.read_text(encoding="utf-8"))

    def health(self):
        taxonomy = self.load_taxonomy()
        roots = [node for node in taxonomy["nodes"] if node["level"] == 1]
        return {
            "service": "pim",
            "status": "ready",
            "canonical_main_categories": len(roots),
            "taxonomy_nodes": len(taxonomy["nodes"]),
            "products_in_db": count_products(),
        }

    def schema(self):
        return json.loads(SCHEMA_JSON.read_text(encoding="utf-8"))

    def supplier_import_schema(self):
        return json.loads(SUPPLIER_SCHEMA_JSON.read_text(encoding="utf-8"))

    def process_import(self, records):
        return process(records)

    def validate(self, product):
        return validate_product(product)

    def import_template_rows(self):
        with TEMPLATE_CSV.open(encoding="utf-8") as handle:
            return list(csv.DictReader(handle))

    def demo_flow(self):
        rows = self.import_template_rows()
        pipeline = self.process_import(rows)
        sample = rows[0] if rows else {}
        product_payload = {
            "sku": sample.get("sku", "DEMO-001"),
            "canonical_category_id": sample.get("canonical_category_id", "bz.01.001.01"),
            "gtin": sample.get("gtin"),
            "mpn": sample.get("mpn"),
            "brand_id": sample.get("brand"),
            "title": sample.get("title_de") or sample.get("title_en"),
            "images": sample.get("image_1"),
        }
        quality = self.validate(product_payload)
        product_id = None
        if quality["valid"]:
            product_id = create_product(
                sku=product_payload["sku"],
                canonical_category_id=product_payload["canonical_category_id"],
                gtin=product_payload.get("gtin") or None,
                mpn=product_payload.get("mpn") or None,
                brand_id=product_payload.get("brand_id") or None,
                quality_score=quality["quality_score"],
                status="imported",
            )
        return {
            "health": self.health(),
            "pipeline": pipeline,
            "quality": quality,
            "product_id": product_id,
            "template_rows": len(rows),
        }
