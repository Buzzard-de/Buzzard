def rank_products(products):
    return sorted(products, key=lambda product: float(product.get("profit", 0)), reverse=True)


def rank_suppliers(suppliers):
    return sorted(suppliers, key=lambda supplier: float(supplier.get("score", 0)), reverse=True)
