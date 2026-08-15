from buzzard_ai_complete.production.agents import AgentRuntime
from buzzard_ai_complete.production.automotive import TecDocAdapter
from buzzard_ai_complete.production.catalog import Catalog, Product
from buzzard_ai_complete.production.checkout import CheckoutEngine
from buzzard_ai_complete.production.importers import import_csv, import_json, import_xml
from buzzard_ai_complete.production.marketplaces import AmazonAdapter, EbayAdapter
from buzzard_ai_complete.production.payments import GenericPaymentAdapter
from buzzard_ai_complete.production.pricing import PricingGuard
from buzzard_ai_complete.production.readiness import ProductionReadiness
from buzzard_ai_complete.production.shipping import GenericCarrierAdapter


def make_catalog():
    catalog = Catalog()
    catalog.upsert(Product("S1", "Test Product", "Test", 20, 5))
    return catalog


def test_catalog_search():
    catalog = make_catalog()
    assert catalog.search("test")[0].sku == "S1"


def test_pricing_guard():
    guard = PricingGuard(minimum_profit=0.50)
    assert guard.evaluate(20, 10, 2, 2, 1).allowed
    assert not guard.evaluate(15, 10, 2, 2, 1).allowed


def test_checkout_flow():
    catalog = make_catalog()
    engine = CheckoutEngine(catalog, PricingGuard())
    cart = engine.create_cart()
    engine.add(cart.cart_id, "S1", 2)
    quote = engine.quote(cart.cart_id)
    assert quote["subtotal"] == 40
    result = engine.checkout(cart.cart_id, "C1", "DE")
    assert result["status"] == "PAYMENT_REQUIRED"


def test_importers():
    assert import_json('[{"sku":"A","name":"A","category":"X","price":2,"stock":3}]')[0].sku == "A"
    assert import_csv("sku,name,category,price,stock\nB,B,X,3,4\n")[0].sku == "B"
    assert (
        import_xml(
            "<products><product><sku>C</sku><name>C</name><category>X</category>"
            "<price>4</price><stock>5</stock></product></products>"
        )[0].sku
        == "C"
    )


def test_external_integrations_do_not_fake_success():
    assert EbayAdapter().status()["status"] == "NOT_CONFIGURED"
    assert AmazonAdapter().status()["status"] == "NOT_CONFIGURED"
    assert GenericPaymentAdapter().status()["status"] == "NOT_CONFIGURED"
    assert GenericCarrierAdapter().status()["status"] == "NOT_CONFIGURED"
    assert TecDocAdapter().status()["status"] == "NOT_CONFIGURED"


def test_agents():
    status = AgentRuntime().status()
    assert set(status["roles"]) == {"dogu_bey", "aslan_bey", "esat_bey"}
    assert status["llm"]["status"] == "NOT_CONFIGURED"


def test_readiness_blocks_live_shop_without_payment():
    result = ProductionReadiness().evaluate({}, 0, False, False, False)
    assert result["ready"] is False
    names = {check["name"] for check in result["checks"]}
    assert {"catalog", "payment", "shipping"} <= names
