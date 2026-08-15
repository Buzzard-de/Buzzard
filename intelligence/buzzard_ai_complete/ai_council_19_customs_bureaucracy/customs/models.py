from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class TradeRoute:
    origin: str
    destination: str
    incoterm: str = "DAP"
    mode: str = "road"


@dataclass
class ProductTradeProfile:
    product_id: str
    description: str
    hs_code: Optional[str] = None
    cn_code: Optional[str] = None
    taric_code: Optional[str] = None
    origin_country: Optional[str] = None
    customs_value: float = 0.0
    net_weight_kg: float = 0.0
    gross_weight_kg: float = 0.0
    quantity: int = 0
    restricted: bool = False
    licenses: List[str] = field(default_factory=list)
    evidence: List[str] = field(default_factory=list)


@dataclass
class CustomsAssessment:
    status: str
    product_id: str
    route: TradeRoute
    tariff_code: Optional[str]
    duties_estimate: Optional[float]
    import_tax_estimate: Optional[float]
    documents: List[str]
    risks: List[str]
    evidence: List[str]
    human_review_required: bool
    notes: Dict[str, str] = field(default_factory=dict)
