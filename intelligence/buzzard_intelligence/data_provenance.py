from .json_store import JsonIntelligenceStore


class DataProvenance(JsonIntelligenceStore):
    def __init__(self, path=None):
        super().__init__(
            111,
            "Data Provenance & Lineage",
            "buzzard_v111.json",
            path,
        )
