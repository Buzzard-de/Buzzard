from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str = "EUR"

@dataclass(frozen=True)
class ProductRef:
    product_id: str
    sku: str
    category_id: str

@dataclass
class CustomerSignal:
    customer_id: str
    signal: str
    value: str
    confidence: float = 1.0

@dataclass
class Evidence:
    source: str
    url: Optional[str] = None
    observed_at: Optional[str] = None
    confidence: float = 1.0
