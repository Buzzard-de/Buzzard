class AutomotiveQueryBuilder:
    def build(self, vehicle, category, product=None):
        parts=[
            vehicle.get("make"),vehicle.get("model"),vehicle.get("year"),
            vehicle.get("engine"),vehicle.get("engine_code"),
            category
        ]
        if product: parts.append(product)
        return " ".join(str(x) for x in parts if x not in (None,""))

    def filters(self, vehicle):
        return {k:v for k,v in vehicle.items() if v not in (None,"")}
