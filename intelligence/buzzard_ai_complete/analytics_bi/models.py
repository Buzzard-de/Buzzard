from dataclasses import dataclass, field
from typing import Dict


@dataclass
class BusinessEvent:
    event_id: str
    event_type: str
    timestamp: str
    value: float = 0.0
    cost: float = 0.0
    metadata: Dict = field(default_factory=dict)


@dataclass
class KPI:
    name: str
    value: float
    unit: str = ""
    target: float | None = None


@dataclass
class Alert:
    name: str
    severity: str
    message: str
    value: float | None = None
