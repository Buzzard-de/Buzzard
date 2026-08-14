from .json_store import JsonIntelligenceStore


class CountryOperationsManager(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            181,
            "Country Operations Manager",
            "buzzard_v181.json",
            path,
        )
