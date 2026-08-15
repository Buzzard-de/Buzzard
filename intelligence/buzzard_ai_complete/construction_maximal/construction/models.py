from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

@dataclass
class ConstructionMachine:
    machine_id: str
    machine_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    engine: Optional[str] = None
    engine_code: Optional[str] = None
    power_kw: Optional[float] = None

@dataclass
class ConstructionPart:
    product_id: str
    name: str
    category_path: str
    attributes: Dict[str, Any] = field(default_factory=dict)
    source: Optional[str] = None

@dataclass
class FitmentResult:
    status: str
    confidence: float
    reasons: List[str] = field(default_factory=list)

@dataclass
class ConstructionNode:
    id: str
    name: str
    level: int
    parent_id: Optional[str] = None
    machine_scope: List[str] = field(default_factory=list)

@dataclass
class MachineProfile:
    machine_id: str
    machine_type: str
    make: Optional[str] = None
    model: Optional[str] = None
    year_from: Optional[int] = None
    year_to: Optional[int] = None
    system: Optional[str] = None

@dataclass
class PartFitment:
    product_id: str
    machine_id: str
    position: Optional[str] = None
    source: Optional[str] = None
    confidence: float = 0.0

@dataclass
class ConstructionProduct:
    product_id: str
    name: str
    category_id: str
    attributes: Dict[str, str] = field(default_factory=dict)
    machine_types: List[str] = field(default_factory=list)
