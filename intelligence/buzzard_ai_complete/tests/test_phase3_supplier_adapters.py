"""Phase 3 Wave 2 supplier adapter tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from buzzard_ai_complete.ai_core.integrations.suppliers.csv import CsvSupplierAdapter
from buzzard_ai_complete.ai_core.integrations.suppliers.normalizer import SupplierNormalizer
from buzzard_ai_complete.ai_core.integrations.suppliers.security import (
    enforce_import_size_limit,
    sanitize_text,
    validate_xml_content,
)
from buzzard_ai_complete.ai_core.integrations.suppliers.xml import XmlSupplierAdapter

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "suppliers"


def test_csv_adapter_reads_fixture_catalog():
    adapter = CsvSupplierAdapter(FIXTURES / "sample_catalog.csv")
    assert adapter.is_configured()
    result = adapter.fetch_catalog(supplier_id="test-supplier")
    assert result["status"] == "ok"
    assert result["count"] == 2
    assert result["records"][0]["sku"] == "SKU-W2-001"


def test_xml_adapter_reads_fixture_catalog():
    adapter = XmlSupplierAdapter(FIXTURES / "sample_catalog.xml")
    result = adapter.fetch_catalog(supplier_id="test-supplier")
    assert result["status"] == "ok"
    assert result["records"][0]["sku"] == "SKU-W2-XML-001"


def test_normalizer_requires_sku_and_name():
    normalizer = SupplierNormalizer()
    with pytest.raises(ValueError, match="missing required"):
        normalizer.normalize_record({"sku": "X"}, supplier_id="sup-1")


def test_normalizer_batch_collects_errors():
    normalizer = SupplierNormalizer()
    normalized, errors = normalizer.normalize_batch(
        [{"sku": "OK", "name": "Good"}, {"sku": "", "name": "Bad"}],
        supplier_id="sup-1",
    )
    assert len(normalized) == 1
    assert len(errors) == 1


def test_malicious_xml_rejected():
    with pytest.raises(ValueError, match="malicious XML"):
        validate_xml_content('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe "bad">]><catalog/>')


def test_sanitize_text_strips_script():
    assert "<script>" not in sanitize_text("hello <script>alert(1)</script>")


def test_import_size_limit_enforced(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setattr(settings, "SUPPLIER_IMPORT_MAX_BYTES", 10)
    with pytest.raises(ValueError, match="exceeds size limit"):
        enforce_import_size_limit("x" * 20)
