from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class CustomerProfile:
    customer_id: str
    email: str
    language: str = "de"
    segment: str = "STANDARD"
    tags: List[str] = field(default_factory=list)
    lifetime_value: float = 0.0
    consent: Dict[str, bool] = field(default_factory=dict)


@dataclass
class Ticket:
    ticket_id: str
    customer_id: str
    subject: str
    message: str
    priority: str = "NORMAL"
    status: str = "OPEN"
    channel: str = "web"


@dataclass
class CustomerEvent:
    customer_id: str
    event_type: str
    value: float = 0.0
    metadata: Dict = field(default_factory=dict)


@dataclass
class Review:
    customer_id: str
    order_id: str
    rating: int
    comment: str = ""
