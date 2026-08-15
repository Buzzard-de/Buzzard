from buzzard_ai_complete.production.integrations import Integration


class SupplierFeedAdapter:
    def __init__(self):
        self.integration = Integration("supplier_feed", ("SUPPLIER_FEED_URL",))

    def status(self):
        return self.integration.status()

    def fetch(self):
        if self.status()["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED"}
        return {"status": "READY_FOR_FETCH"}
