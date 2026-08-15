from pathlib import Path

from buzzard_ai_complete.commands import (
    complete_commerce_integration_order,
    complete_commerce_production_work,
)


def test_commerce_production_work_doc():
    doc = complete_commerce_production_work()
    assert "remaining work" in doc.lower()
    assert "sandbox" in doc.lower()


def test_commerce_integration_order_doc():
    doc = complete_commerce_integration_order()
    assert "Supplier API" in doc
    assert "end-to-end" in doc.lower()


def test_f3_integration_scaffolds_exist():
    pack = Path(__file__).resolve().parents[2]
    assert (pack / "commerce" / "risk").is_dir()
    assert (pack / "integrations" / "shipping" / "dhl").is_dir()
    assert (pack / "integrations" / "marketplaces" / "amazon").is_dir()
    assert (pack / "operations" / "backups").is_dir()
