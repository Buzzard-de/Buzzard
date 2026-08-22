"""Phase 3 Wave 3 stock reconciliation tests."""

from __future__ import annotations

from buzzard_ai_complete.ai_core.intelligence.stock.reconciler import StockReconciler, StockSource


def test_stock_reconciler_merges_three_sources():
    reconciler = StockReconciler()
    sources = [
        StockSource("wms", 50, reserved=5),
        StockSource("commerce", 48, reserved=5),
        StockSource("supplier", 100),
    ]
    result = reconciler.merge("SKU-1", sources, safety_stock=10)
    assert result.wms_stock == 50
    assert result.available_stock == 45
    assert result.conflict is True


def test_stock_reconciler_supplier_only_fallback():
    reconciler = StockReconciler()
    sources = [StockSource("supplier", 25)]
    result = reconciler.merge("SKU-2", sources)
    assert result.available_stock == 25
    assert result.conflict is False


def test_stock_sync_persists_snapshot(session, monkeypatch):
    from pathlib import Path

    from buzzard_ai_complete.ai_core.integrations.factory import reset_integration_registry_for_tests
    from buzzard_ai_complete.ai_core.services.stock_service import StockService
    from buzzard_ai_complete.ai_core.services.supplier_service import SupplierService

    fixtures = Path(__file__).resolve().parent / "fixtures" / "suppliers"
    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    monkeypatch.setenv("SUPPLIER_FEED_TYPE", "csv")
    monkeypatch.setenv("SUPPLIER_FEED_PATH", str(fixtures / "sample_catalog.csv"))
    monkeypatch.setenv("SUPPLIER_CREDENTIALS_KEY", "test-key")
    import buzzard_ai_complete.config.settings as settings

    settings.BUZZARD_AI_CORE_V3 = True
    settings.SUPPLIER_FEED_TYPE = "csv"
    settings.SUPPLIER_FEED_PATH = str(fixtures / "sample_catalog.csv")
    settings.SUPPLIER_CREDENTIALS_KEY = "test-key"
    reset_integration_registry_for_tests()

    supplier_svc = SupplierService(session)
    supplier = supplier_svc.create_supplier(
        supplier_code="stock-sup",
        name="Stock Supplier",
        feed_type="csv",
        feed_path=str(fixtures / "sample_catalog.csv"),
    )
    session.commit()
    supplier_svc.sync_supplier(supplier.id)
    session.commit()

    svc = StockService(session)
    result = svc.sync_stock("SKU-W2-001")
    session.commit()
    assert result["status"] == "ok"
    assert result["supplier_stock"] >= 0
