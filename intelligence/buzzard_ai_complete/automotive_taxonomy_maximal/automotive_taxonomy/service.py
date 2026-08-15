from .catalog.engine import AutomotiveTaxonomy
from .compatibility.selector import VehicleSelector
from .compatibility.fitment import FitmentEngine

class AutomotiveProductIntelligence:
    def __init__(self, taxonomy, vehicles):
        self.taxonomy=taxonomy
        self.selector=VehicleSelector(vehicles)
        self.fitment=FitmentEngine(taxonomy)

    def find_parts_for_vehicle(self, vehicle_filters, category=None):
        vehicles=self.selector.select(**vehicle_filters)
        result=[]
        for vehicle in vehicles:
            nodes=self.taxonomy.search(category) if category else list(self.taxonomy.nodes.values())
            result.append({
                "vehicle":vehicle,
                "categories":nodes
            })
        return result

    def product_path(self, node_id):
        return [n.name for n in self.taxonomy.path(node_id)]
