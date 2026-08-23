"""Phase 3 Wave 2 product pipeline end-to-end tests."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from buzzard_ai_complete.ai_core.integrations.factory import reset_integration_registry_for_tests
from buzzard_ai_complete.ai_core.services.product_pipeline_service import ProductPipelineService
from buzzard_ai_complete.ai_core.services.supplier_service import SupplierService
from buzzard_ai_complete.api.app import app

AUTH = {"Authorization": "Bearer test-token-phase1"}
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "suppliers"


@pytest.fixture(autouse=True)
def enable_v3(monkeypatch):
    import buzzard_ai_complete.config.settings as settings

    monkeypatch.setenv("BUZZARD_AI_CORE_V3", "1")
    monkeypatch.setenv("BUZZARD_API_PERMISSIONS_ENABLED", "0")
    monkeypatch.setenv("BUZZARD_JWT_ENABLED", "0")
    monkeypatch.setenv("SUPPLIER_CREDENTIALS_KEY", "test-credentials-key-wave2")
    monkeypatch.setenv("SUPPLIER_FEED_TYPE", "csv")
    monkeypatch.setenv("SUPPLIER_FEED_PATH", str(FIXTURES / "sample_catalog.csv"))
    settings.BUZZARD_AI_CORE_V3 = True
    settings.BUZZARD_API_PERMISSIONS_ENABLED = False
    settings.BUZZARD_JWT_ENABLED = False
    settings.SUPPLIER_CREDENTIALS_KEY = "test-credentials-key-wave2"
    settings.SUPPLIER_FEED_TYPE = "csv"
    settings.SUPPLIER_FEED_PATH = str(FIXTURES / "sample_catalog.csv")
    reset_integration_registry_for_tests()
    yield
    reset_integration_registry_for_tests()


@pytest.fixture
def api_client():
    return TestClient(app)


def test_supplier_sync_produces_products_in_db(session):
    svc = SupplierService(session)
    supplier = svc.create_supplier(
        supplier_code="wave2-test",
        name="Wave2 Test Supplier",
        feed_type="csv",
        feed_path=str(FIXTURES / "sample_catalog.csv"),
    )
    session.commit()

    result = svc.sync_supplier(supplier.id)
    session.commit()

    assert result["status"] == "ok"
    assert result["products_synced"] == 2

    products = ProductPipelineService(session).list_products(supplier_id=supplier.id)
    assert len(products) == 2
    assert products[0].taxonomy_id in {"bz.01", "bz.15"}


def test_product_enrichment_pipeline(session, monkeypatch):
    svc = SupplierService(session)
    supplier = svc.create_supplier(
        supplier_code="wave2-enrich",
        name="Enrich Supplier",
        feed_type="csv",
        feed_path=str(FIXTURES / "sample_catalog.csv"),
    )
    session.commit()
    svc.sync_supplier(supplier.id)
    session.commit()

    pipeline = ProductPipelineService(session)
    result = pipeline.enrich_product("SKU-W2-001", supplier_id=supplier.id)
    session.commit()

    assert result["status"] == "ok"
    assert result["product"]["enrichment_status"] == "enriched"


def test_suppliers_api_create_and_sync(api_client, session):
    response = api_client.post(
        "/api/v1/suppliers",
        headers=AUTH,
        json={
            "supplier_code": "api-supplier",
            "name": "API Supplier",
            "feed_type": "csv",
            "feed_path": str(FIXTURES / "sample_catalog.csv"),
        },
    )
    assert response.status_code == 200
    supplier_id = response.json()["id"]

    sync = api_client.post(f"/api/v1/suppliers/{supplier_id}/sync", headers=AUTH)
    assert sync.status_code == 200
    assert sync.json()["products_synced"] == 2


def test_products_api_list_and_enrich(api_client, session):
    create = api_client.post(
        "/api/v1/suppliers",
        headers=AUTH,
        json={
            "supplier_code": "api-products",
            "name": "Products API Supplier",
            "feed_type": "csv",
            "feed_path": str(FIXTURES / "sample_catalog.csv"),
        },
    )
    supplier_id = create.json()["id"]
    api_client.post(f"/api/v1/suppliers/{supplier_id}/sync", headers=AUTH)

    listed = api_client.get("/api/v1/products", headers=AUTH)
    assert listed.status_code == 200
    assert len(listed.json()["items"]) >= 2

    enrich = api_client.post("/api/v1/products/SKU-W2-001/enrich", headers=AUTH, json={"supplier_id": supplier_id})
    assert enrich.status_code == 200
    assert enrich.json()["status"] == "ok"
