import json
from pathlib import Path

from buzzard_ai_complete.pim_product_master.service import PimProductMasterService

SCHEMA = Path(__file__).resolve().parents[1] / "pim_product_master" / "schemas" / "product_master.json"
TEMPLATE = Path(__file__).resolve().parents[1] / "pim_product_master" / "data" / "product_import_template.csv"


def test_schema():
    payload = json.loads(SCHEMA.read_text(encoding="utf-8"))
    assert payload["entity"] == "ProductMaster"


def test_taxonomy():
    service = PimProductMasterService()
    taxonomy = service.load_taxonomy()
    roots = [node for node in taxonomy["nodes"] if node["level"] == 1]
    assert len(roots) == 43


def test_template_exists():
    assert TEMPLATE.exists()


def test_import_pipeline_dedupes():
    service = PimProductMasterService()
    result = service.process_import(
        [
            {"sku": "A1", "title": "One"},
            {"sku": "A1", "title": "Duplicate"},
        ]
    )
    assert len(result["accepted_candidates"]) == 1
    assert len(result["duplicates"]) == 1


def test_quality_requires_canonical_category():
    service = PimProductMasterService()
    result = service.validate({"sku": "X", "canonical_category_id": "cat-01"})
    assert result["valid"] is False
    assert "CATEGORY_NOT_CANONICAL" in result["errors"]
