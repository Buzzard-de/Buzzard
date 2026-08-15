class TaxPolicyV2:
    def __init__(self, default_rate=19.0):
        self.default_rate = float(default_rate)

    def rate_for(self, country, product_type="standard"):
        return self.default_rate
