from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class TireCategory:
    id: str
    name: str
    level: int
    parent_id: Optional[str] = None
    vehicle_types: List[str] = field(default_factory=list)

@dataclass
class TireSpec:
    width_mm: Optional[int]=None
    aspect_ratio: Optional[int]=None
    rim_inch: Optional[float]=None
    load_index: Optional[str]=None
    speed_index: Optional[str]=None
    season: Optional[str]=None
    construction: Optional[str]=None
    runflat: Optional[bool]=None
    reinforced_xl: Optional[bool]=None
    ev_optimized: Optional[bool]=None
    m_s: Optional[bool]=None
    three_pmsf: Optional[bool]=None
    use: Optional[str]=None
    axle: Optional[str]=None
    position: Optional[str]=None
    dot: Optional[str]=None

@dataclass
class TireFitment:
    tire_product_id: str
    vehicle_type: str
    make: Optional[str]=None
    model: Optional[str]=None
    year_from: Optional[int]=None
    year_to: Optional[int]=None
    engine: Optional[str]=None
    axle: Optional[str]=None
    position: Optional[str]=None
    evidence_source: Optional[str]=None
    confidence: float=0.0
