from buzzard_ai_complete.production.integrations import Integration


class ShippingAdapter:
    def __init__(self, name, required_env):
        self.integration = Integration(name, tuple(required_env))

    def status(self):
        return self.integration.status()

    def create_label(self, shipment):
        if self.status()["status"] != "CONFIGURED":
            return {"status": "NOT_CONFIGURED", "carrier": self.integration.name}
        return {"status": "READY_FOR_PROVIDER_CALL", "carrier": self.integration.name}


class GenericCarrierAdapter(ShippingAdapter):
    def __init__(self):
        super().__init__("carrier", ("CARRIER_API_URL", "CARRIER_API_KEY"))
