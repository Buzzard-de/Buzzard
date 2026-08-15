import json
from pathlib import Path

from buzzard_ai_complete.supplier_import_enrichment_engine.engine.pipeline import ImportEngine

MODULE_DATA = Path(__file__).resolve().parents[1] / "supplier_import_enrichment_engine" / "data"


def test_normalization_and_quality():
    record = {
        "supplier_sku": " A-1 ",
        "ean": "12345670",
        "brand": "Acme",
        "mpn": "x-1",
        "title": "Test Product",
        "category": "Brake Pad",
        "attributes": {"Farbe": "Rot"},
    }
    result = ImportEngine("supplier-1").process([record])
    assert result["received"] == 1
    assert result["results"][0]["normalized"]["supplier_sku"] == "A-1"
    assert "color" in result["results"][0]["attributes"]


def test_duplicate():
    engine = ImportEngine(
        "s",
        existing_index={("supplier_sku", "s|A-1"): "product-1"},
    )
    result = engine.process([{"supplier_sku": "A-1", "title": "X"}])
    assert result["results"][0]["decision"] == "duplicate"


def test_taxonomy():
    taxonomy = json.loads((MODULE_DATA / "taxonomy.json").read_text(encoding="utf-8"))
    assert len([node for node in taxonomy["nodes"] if node["level"] == 1]) == 43


def test_config():
    config = json.loads((MODULE_DATA / "import_engine_config.json").read_text(encoding="utf-8"))
    assert config["dry_run_default"] is True
    assert "duplicate_detection" in config["pipeline"]


def test_demo_flow():
    from buzzard_ai_complete.supplier_import_enrichment_engine.service import (
        SupplierImportEnrichmentService,
    )

    demo = SupplierImportEnrichmentService().demo_flow()
    assert demo["health"]["status"] == "ready"
    assert demo["preview"]["received"] == 2
