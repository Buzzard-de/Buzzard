from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class TaxonomyNode:
    id: str
    name: str
    level: int
    parent_id: Optional[str] = None
    node_type: str = "category"
    vehicle_scope: List[str] = field(default_factory=list)
    synonyms: List[str] = field(default_factory=list)

@dataclass
class ProductNode:
    id: str
    name: str
    category_id: str
    parent_product_group_id: Optional[str] = None
    attributes: Dict[str, str] = field(default_factory=dict)
    vehicle_scope: List[str] = field(default_factory=list)

@dataclass
class VehicleProfile:
    vehicle_id: str
    make: str
    model: str
    generation: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    engine: Optional[str] = None
    engine_code: Optional[str] = None
    fuel: Optional[str] = None
    power_kw: Optional[float] = None
    drivetrain: Optional[str] = None
    transmission: Optional[str] = None
    body: Optional[str] = None

@dataclass
class FitmentRule:
    product_id: str
    vehicle_id: str
    position: Optional[str] = None
    axle: Optional[str] = None
    engine_variant: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = None
    confidence: float = 0.0
