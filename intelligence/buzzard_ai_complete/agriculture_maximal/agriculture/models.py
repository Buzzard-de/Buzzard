from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class AgricultureNode:
    id: str
    name: str
    level: int
    parent_id: Optional[str]=None
    vehicle_scope: List[str]=field(default_factory=list)
    synonyms: List[str]=field(default_factory=list)

@dataclass
class MachineProfile:
    machine_id: str
    machine_type: str
    make: str
    model: str
    year_from: Optional[int]=None
    year_to: Optional[int]=None
    engine: Optional[str]=None
    engine_code: Optional[str]=None
    power_kw: Optional[float]=None
    transmission: Optional[str]=None

@dataclass
class PartFitment:
    product_id: str
    machine_id: str
    system: Optional[str]=None
    position: Optional[str]=None
    source: Optional[str]=None
    confidence: float=0.0

@dataclass
class AgriculturalProduct:
    product_id: str
    name: str
    category_id: str
    brand: Optional[str]=None
    attributes: Dict[str,str]=field(default_factory=dict)
    machine_types: List[str]=field(default_factory=list)
