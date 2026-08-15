from buzzard_ai_complete.commerce.profitability.engine import ProfitabilityEngine
from buzzard_ai_complete.commerce.service import CommerceService


def test_commerce_product_and_decision(tmp_path, monkeypatch):
    import buzzard_ai_complete.config.settings as settings
    import buzzard_ai_complete.database.db as dbmod

    db = tmp_path / "commerce.db"
    monkeypatch.setattr(settings, "DB_PATH", db)
    monkeypatch.setattr(dbmod, "DB_PATH", db)
    svc = CommerceService()
    svc.products.upsert(
        "SKU-1",
        "Test Product",
        "Tools",
        purchase_price=50,
        shipping_cost=5,
        marketplace_fee=5,
        payment_fee=2,
        tax_rate=0.0,
        ad_cost=2,
        target_margin=0.07,
    )
    svc.competitors.record_price("SKU-1", "Competitor A", "https://example.com/a", 80)
    result = svc.evaluate_product("SKU-1", 79)
    assert result["net_profit"] > 0.5
    assert result["decision"] in {"SELL", "TEST", "REJECT"}


def test_profit_floor_rejects():
    r = ProfitabilityEngine(0.50).calculate(10, 9.8)
    assert r.viable is False
