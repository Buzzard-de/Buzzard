from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

@dataclass
class Product:
    product_id: str
    name: str
    category_id: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    compatible_systems: List[str] = field(default_factory=list)
    source: Optional[str] = None

@dataclass
class EnergySystem:
    system_id: str
    system_type: str
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    voltage: Optional[str] = None
    power_kw: Optional[float] = None
    capacity_kwh: Optional[float] = None
