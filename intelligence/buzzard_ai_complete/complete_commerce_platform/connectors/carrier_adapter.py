class CarrierAdapter:
    def quote(self, shipment):
        raise NotImplementedError

    def buy_label(self, shipment):
        raise NotImplementedError

    def track(self, tracking):
        raise NotImplementedError

    def cancel_label(self, label_id):
        raise NotImplementedError
