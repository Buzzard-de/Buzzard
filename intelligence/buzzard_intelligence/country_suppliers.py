from .json_store import JsonIntelligenceStore


class CountrySupplierNetworks(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            186,
            "Country Supplier Networks",
            "buzzard_v186.json",
            path,
        )
