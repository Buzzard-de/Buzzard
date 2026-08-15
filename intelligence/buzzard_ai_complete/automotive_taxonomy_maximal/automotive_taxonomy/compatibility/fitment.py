class FitmentEngine:
    """
    Resolves product compatibility using structured vehicle attributes.
    A production deployment should ingest verified TecDoc/OEM/supplier data
    and retain source + timestamp + confidence for every fitment relation.
    """
    def __init__(self, taxonomy):
        self.taxonomy=taxonomy
        self.rules=[]

    def add_rule(self, rule):
        self.rules.append(rule)

    def find(self, vehicle, product_id=None, position=None):
        rows=[]
        for r in self.rules:
            if product_id and r.product_id != product_id:
                continue
            if r.vehicle_id != vehicle.vehicle_id:
                continue
            if position and r.position and r.position != position:
                continue
            rows.append(r)
        return rows

    def explain(self, rule):
        return {
            "product_id":rule.product_id,
            "vehicle_id":rule.vehicle_id,
            "position":rule.position,
            "axle":rule.axle,
            "engine_variant":rule.engine_variant,
            "source":rule.source,
            "confidence":rule.confidence
        }
