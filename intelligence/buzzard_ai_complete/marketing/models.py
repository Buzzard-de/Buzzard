from dataclasses import dataclass, field
from typing import Dict


@dataclass
class Campaign:
    campaign_id: str
    name: str
    channel: str
    budget: float
    objective: str = "SALES"
    status: str = "DRAFT"
    metadata: Dict = field(default_factory=dict)


@dataclass
class Performance:
    campaign_id: str
    spend: float
    revenue: float
    conversions: int
    clicks: int = 0
    impressions: int = 0

    @property
    def roas(self):
        return round(self.revenue / self.spend, 2) if self.spend else 0.0

    @property
    def conversion_rate(self):
        return round(self.conversions / self.clicks, 4) if self.clicks else 0.0
