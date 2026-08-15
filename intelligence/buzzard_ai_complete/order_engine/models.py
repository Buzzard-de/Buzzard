from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class OrderItem:
    sku: str
    quantity: int
    unit_price: float


@dataclass
class Order:
    order_id: str
    customer_id: str
    country: str
    postal_code: str
    items: List[OrderItem] = field(default_factory=list)
    payment_status: str = "PENDING"
    status: str = "NEW"
    tracking_number: str = ""
    carrier: str = ""
    supplier: str = ""
    notes: Dict = field(default_factory=dict)


@dataclass
class FulfillmentResult:
    order_id: str
    status: str
    supplier: str = ""
    carrier: str = ""
    tracking_number: str = ""
    errors: List[str] = field(default_factory=list)
