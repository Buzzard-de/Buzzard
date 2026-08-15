class DataQuality:
    def required(self, data, fields):
        return [field for field in fields if not data.get(field)]

    def score(self, data, fields):
        if not fields:
            return 1.0
        return round(sum(bool(data.get(field)) for field in fields) / len(fields), 2)
