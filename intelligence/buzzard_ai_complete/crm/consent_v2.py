class ConsentLedgerV2:
    def __init__(self):
        self.records = {}

    def set(self, customer_id, purpose, granted, source="unknown"):
        self.records[(customer_id, purpose)] = {"granted": bool(granted), "source": source}
        return self.records[(customer_id, purpose)]

    def allowed(self, customer_id, purpose):
        return self.records.get((customer_id, purpose), {}).get("granted", False)
