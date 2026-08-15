class TireMarketAttributes:
    REQUIRED=["brand","model","size","season","load_index","speed_index"]
    OPTIONAL=[
        "runflat","xl","ev_optimized","m_s","three_pmsf","fuel_efficiency",
        "wet_grip","external_noise_db","dot","ean","oe_marking","country_of_origin"
    ]
    def normalize(self, product):
        return {k:product.get(k) for k in self.REQUIRED+self.OPTIONAL if k in product}
