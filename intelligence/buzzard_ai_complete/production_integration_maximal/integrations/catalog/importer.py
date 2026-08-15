class CatalogImporter:
    def __init__(self, normalizer, product_store, audit):
        self.normalizer = normalizer
        self.product_store = product_store
        self.audit = audit

    def import_items(self, items, source):
        ok = 0
        errors = []
        for raw in items:
            try:
                item = self.normalizer.normalize(raw)
                item["source"] = source
                self.product_store.upsert(item)
                ok += 1
            except Exception as exc:
                errors.append({"type": type(exc).__name__})
        self.audit({"source": source, "ok": ok, "errors": len(errors)})
        return {"source": source, "imported": ok, "errors": errors}
