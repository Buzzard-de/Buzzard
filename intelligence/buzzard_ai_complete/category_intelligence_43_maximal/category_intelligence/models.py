from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class SourceEvidence:
    source_id: str
    url: str
    observed_at: str
    source_type: str = "public_web"
    title: Optional[str] = None
    confidence: float = 0.0
    claim: Optional[str] = None

@dataclass
class SellerOffer:
    seller_id: str
    seller_name: str
    product_key: str
    title: str
    price: float
    currency: str = "EUR"
    shipping_price: Optional[float] = None
    availability: Optional[str] = None
    url: Optional[str] = None
    observed_at: Optional[str] = None
    evidence: List[SourceEvidence] = field(default_factory=list)

@dataclass
class CategoryNode:
    node_id: str
    name: str
    level: int
    parent_id: Optional[str] = None
    source: str = "buzzard"
    evidence: List[SourceEvidence] = field(default_factory=list)

@dataclass
class CategoryOpportunity:
    opportunity_id: str
    category_id: str
    opportunity_type: str
    name: str
    evidence_count: int
    confidence: float
    reasons: List[str] = field(default_factory=list)
    competitor_examples: List[str] = field(default_factory=list)
    estimated_price_range: Optional[Dict[str, float]] = None
    requires_human_review: bool = True

@dataclass
class CategoryReport:
    category_id: str
    period: str
    offers_seen: int
    unique_sellers: int
    price_statistics: Dict[str, float]
    missing_categories: List[CategoryOpportunity]
    missing_products: List[CategoryOpportunity]
    changes: List[Dict]
    risks: List[str]
    evidence: List[SourceEvidence]
