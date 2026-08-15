import csv
from decimal import Decimal

REQUIRED = {"sku", "title", "price", "currency", "stock"}


class PIMImportPipeline:
    def __init__(self, repository):
        self.repository = repository

    def validate(self, item):
        missing = REQUIRED - set(item)
        if missing:
            return False, {"reason": "missing_fields", "fields": sorted(missing)}
        try:
            price = Decimal(str(item["price"]))
            stock = int(item["stock"])
        except Exception:
            return False, {"reason": "invalid_numeric_fields"}
        if price < 0 or stock < 0:
            return False, {"reason": "negative_price_or_stock"}
        return True, {}

    def normalize(self, item, source):
        return {
            "sku": str(item["sku"]).strip(),
            "title": str(item["title"]).strip(),
            "price": str(item["price"]),
            "currency": str(item.get("currency", "EUR")).upper(),
            "stock": int(item["stock"]),
            "ean": item.get("ean"),
            "mpn": item.get("mpn"),
            "brand": item.get("brand"),
            "category_id": item.get("category_id"),
            "source": source,
        }

    def import_items(self, items, source):
        imported = 0
        rejected = []
        seen = set()
        for raw in items:
            ok, reason = self.validate(raw)
            if not ok:
                rejected.append({"item": raw.get("sku"), **reason})
                continue
            normalized = self.normalize(raw, source)
            if normalized["sku"] in seen:
                rejected.append({"item": normalized["sku"], "reason": "duplicate_in_batch"})
                continue
            seen.add(normalized["sku"])
            self.repository.upsert(normalized)
            imported += 1
        return {"source": source, "imported": imported, "rejected": rejected}

    def import_csv(self, path, source):
        with open(path, newline="", encoding="utf-8-sig") as handle:
            return self.import_items(list(csv.DictReader(handle)), source)
