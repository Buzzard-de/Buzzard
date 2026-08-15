class SupplierFeed:
    name = "base"

    def fetch(self):
        raise NotImplementedError

    def parse(self, payload):
        raise NotImplementedError

    def health(self):
        raise NotImplementedError


class SupplierNormalizer:
    REQUIRED = {"sku", "title", "price", "currency", "stock"}

    def normalize(self, item):
        missing = self.REQUIRED - set(item)
        if missing:
            raise ValueError("MISSING_FIELDS:" + ",".join(sorted(missing)))
        return {
            "supplier_sku": str(item["sku"]),
            "title": str(item["title"]).strip(),
            "price": item["price"],
            "currency": item.get("currency", "EUR"),
            "stock": int(item.get("stock", 0)),
            "ean": item.get("ean"),
            "mpn": item.get("mpn"),
            "brand": item.get("brand"),
            "raw": item,
        }
