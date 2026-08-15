from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class LivestockNode:
    id: str
    name: str
    level: int
    parent_id: Optional[str]=None
    animal_scope: List[str]=field(default_factory=list)
    synonyms: List[str]=field(default_factory=list)

@dataclass
class LivestockEquipment:
    product_id: str
    name: str
    category_id: str
    animal_types: List[str]=field(default_factory=list)
    attributes: Dict[str,str]=field(default_factory=dict)

@dataclass
class FarmEquipmentProfile:
    equipment_id: str
    equipment_type: str
    make: Optional[str]=None
    model: Optional[str]=None
    year_from: Optional[int]=None
    year_to: Optional[int]=None
    capacity: Optional[str]=None

@dataclass
class EquipmentFitment:
    product_id: str
    equipment_id: str
    position: Optional[str]=None
    source: Optional[str]=None
    confidence: float=0.0
