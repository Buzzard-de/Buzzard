class SupplierSync:
    def __init__(self, feeds, product_upsert, audit):
        self.feeds = feeds
        self.product_upsert = product_upsert
        self.audit = audit

    def run(self):
        report = []
        for name, feed in self.feeds.items():
            try:
                payload = feed.fetch()
                items = feed.parse(payload)
                count = 0
                for item in items:
                    self.product_upsert(item)
                    count += 1
                report.append({"supplier": name, "status": "ok", "items": count})
            except Exception as exc:
                report.append({"supplier": name, "status": "error", "error": type(exc).__name__})
        self.audit(report)
        return report
