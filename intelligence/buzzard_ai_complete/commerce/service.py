from buzzard_ai_complete.commerce.catalog.service import ProductCatalog
from buzzard_ai_complete.commerce.competitors.service import CompetitorService
from buzzard_ai_complete.commerce.decisions.engine import CommerceDecisionEngine
from buzzard_ai_complete.commerce.inventory.service import InventoryService
from buzzard_ai_complete.commerce.logistics.service import LogisticsService
from buzzard_ai_complete.commerce.market.service import MarketService
from buzzard_ai_complete.commerce.orders.service import OrderService
from buzzard_ai_complete.commerce.suppliers.service import SupplierService
from buzzard_ai_complete.core.time import now
from buzzard_ai_complete.database.db import connect, init_db


class CommerceService:
    def __init__(self):
        init_db()
        self.products = ProductCatalog()
        self.suppliers = SupplierService()
        self.competitors = CompetitorService()
        self.market = MarketService()
        self.inventory = InventoryService()
        self.logistics = LogisticsService()
        self.orders = OrderService()
        self.decisions = CommerceDecisionEngine()

    def evaluate_product(self, sku, selling_price):
        product = self.products.get(sku)
        if not product:
            raise KeyError("product not found")
        prices = [r["price"] for r in self.competitors.prices(sku)]
        result = self.decisions.evaluate(product, selling_price, prices)
        with connect() as c:
            c.execute(
                "INSERT INTO product_decisions(sku,decision,score,net_profit,net_margin,reasons,created_at) VALUES(?,?,?,?,?,?,?)",
                (
                    sku,
                    result["decision"],
                    result["score"],
                    result["net_profit"],
                    result["net_margin"],
                    str(result["competitive"]),
                    now(),
                ),
            )
        return result
