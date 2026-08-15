from buzzard_ai_complete.production.agents import AgentRuntime
from buzzard_ai_complete.production.automotive import TecDocAdapter
from buzzard_ai_complete.production.catalog import Catalog, Product
from buzzard_ai_complete.production.checkout import CheckoutEngine
from buzzard_ai_complete.production.importers import import_csv, import_json
from buzzard_ai_complete.production.integrations import IntegrationRegistry
from buzzard_ai_complete.production.marketplaces import AmazonAdapter, EbayAdapter
from buzzard_ai_complete.production.payments import GenericPaymentAdapter
from buzzard_ai_complete.production.pricing import PricingGuard
from buzzard_ai_complete.production.readiness import ProductionReadiness
from buzzard_ai_complete.production.shipping import GenericCarrierAdapter


class ProductionMaxService:
    def __init__(self):
        self.catalog = Catalog()
        self.pricing = PricingGuard()
        self.checkout = CheckoutEngine(self.catalog, self.pricing)

    def integration_registry(self):
        registry = IntegrationRegistry()
        for adapter in [
            EbayAdapter(),
            AmazonAdapter(),
            GenericPaymentAdapter(),
            GenericCarrierAdapter(),
            TecDocAdapter(),
        ]:
            registry.register(adapter.integration.name, *adapter.integration.required_env)
        registry.register("llm", "LLM_API_URL", "LLM_API_KEY", "LLM_MODEL")
        return registry

    def demo_flow(self):
        self.catalog.upsert(Product("S1", "Test Product", "Test", 20, 5))
        cart = self.checkout.create_cart()
        self.checkout.add(cart.cart_id, "S1", 2)
        quote = self.checkout.quote(cart.cart_id)
        checkout_result = self.checkout.checkout(cart.cart_id, "C-DEMO", "DE")
        imported = import_json('[{"sku":"A","name":"A","category":"X","price":2,"stock":3}]')
        return {
            "catalog_search": [product.sku for product in self.catalog.search("test")],
            "pricing_guard": self.pricing.evaluate(20, 10, 2, 2, 1).__dict__,
            "quote": quote,
            "checkout": checkout_result,
            "imported_skus": [product.sku for product in imported],
            "integrations": self.integration_registry().status(),
            "agents": AgentRuntime().status(),
            "readiness": self.readiness(),
        }

    def readiness(self, catalog_count=None):
        statuses = self.integration_registry().status()
        payment = statuses["payment"]["status"] == "CONFIGURED"
        shipping = statuses["carrier"]["status"] == "CONFIGURED"
        ai = AgentRuntime().llm.status()["status"] == "CONFIGURED"
        count = catalog_count if catalog_count is not None else len(self.catalog.active_products())
        return ProductionReadiness().evaluate(statuses, count, payment, shipping, ai)
