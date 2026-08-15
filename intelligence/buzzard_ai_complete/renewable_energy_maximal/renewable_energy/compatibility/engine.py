from buzzard_ai_complete.renewable_energy_maximal.renewable_energy.models import EnergySystem, Product

class CompatibilityEngine:
    def __init__(self, systems=None, products=None):
        self.systems = systems or []
        self.products = products or []

    def match(self, system: EnergySystem, product: Product):
        attrs = product.attributes
        checks = []
        for key in ("voltage", "power_kw", "capacity_kwh"):
            if key in attrs and getattr(system, key) is not None:
                checks.append(attrs[key] == getattr(system, key))
        if not checks:
            return {"status": "unknown", "confidence": 0.0}
        confidence = sum(checks) / len(checks)
        return {"status": "compatible" if confidence == 1 else "review", "confidence": confidence}
