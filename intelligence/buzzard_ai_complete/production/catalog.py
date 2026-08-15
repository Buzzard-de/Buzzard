from dataclasses import dataclass
from typing import Optional


@dataclass
class Product:
    sku: str
    name: str
    category: str
    price: float
    stock: int = 0
    active: bool = True
    brand: str = ""
    supplier_id: Optional[str] = None


class Catalog:
    def __init__(self):
        self.products = {}

    def upsert(self, product: Product):
        if not product.sku or not product.name or not product.category:
            raise ValueError("product_identity_required")
        if product.price < 0 or product.stock < 0:
            raise ValueError("invalid_product_values")
        self.products[product.sku] = product
        return product

    def get(self, sku):
        return self.products.get(sku)

    def active_products(self):
        return [product for product in self.products.values() if product.active]

    def search(self, query):
        normalized = query.lower().strip()
        return [
            product
            for product in self.active_products()
            if normalized in product.sku.lower()
            or normalized in product.name.lower()
            or normalized in product.category.lower()
        ]
