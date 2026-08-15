class ProductSearchEngine:
    def __init__(self, index, taxonomy, compatibility=None):
        self.index=index
        self.taxonomy=taxonomy
        self.compatibility=compatibility

    def parse_query(self, text):
        return {
            "raw": text,
            "tokens": [x for x in text.lower().split() if x],
            "vehicle_terms": self._extract_vehicle_terms(text),
        }

    def _extract_vehicle_terms(self, text):
        keys=("vw","golf","bmw","mercedes","audi","ford","opel","toyota","205/55r16")
        t=text.lower()
        return [k for k in keys if k in t]

    def search(self, text, filters=None, limit=20):
        parsed=self.parse_query(text)
        return self.index.search(parsed, filters or {}, limit)

    def compatible(self, vehicle, product_id):
        if not self.compatibility:
            return {"status":"not_configured"}
        return self.compatibility.check(vehicle, product_id)
