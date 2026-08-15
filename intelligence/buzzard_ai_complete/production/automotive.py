from buzzard_ai_complete.production.integrations import Integration


class TecDocAdapter:
    def __init__(self):
        self.integration = Integration("tecdoc", ("TECDOC_API_URL", "TECDOC_API_KEY"))

    def status(self):
        return self.integration.status()

    def vehicle_compatibility(self, vehicle_id, sku):
        if self.status()["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED", "vehicle_id": vehicle_id, "sku": sku}
        return {"status": "READY_FOR_PROVIDER_CALL", "vehicle_id": vehicle_id, "sku": sku}
