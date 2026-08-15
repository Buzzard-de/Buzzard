class CarrierProvider:
    name = "base"

    def quote(self, shipment):
        raise NotImplementedError

    def create_label(self, shipment):
        raise NotImplementedError

    def track(self, tracking_number):
        raise NotImplementedError

    def cancel_label(self, label_id):
        raise NotImplementedError

    def parse_webhook(self, body):
        raise NotImplementedError

    def verify_webhook(self, headers, body):
        raise NotImplementedError
