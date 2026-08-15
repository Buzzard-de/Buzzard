from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class SocialEvidence:
    platform: str
    source_url: str = ""
    observed_at: str = ""
    source_type: str = "public"
    author_handle: Optional[str] = None
    content_id: Optional[str] = None
    title: Optional[str] = None
    text_excerpt: Optional[str] = None
    engagement: Dict[str, float] = field(default_factory=dict)
    confidence: float = 0.0

@dataclass
class SocialSignal:
    signal_id: str
    platform: str
    signal_type: str
    topic: str
    strength: float
    direction: str
    evidence: List[SocialEvidence] = field(default_factory=list)
    related_products: List[str] = field(default_factory=list)
    related_categories: List[str] = field(default_factory=list)
    risks: List[str] = field(default_factory=list)

@dataclass
class SocialOpportunity:
    opportunity_id: str
    topic: str
    score: float
    reasons: List[str]
    supporting_signals: List[str]
    platforms: List[str]
    requires_human_review: bool = True
