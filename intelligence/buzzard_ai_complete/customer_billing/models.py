from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Customer:
    customer_id: str
    email: str
    first_name: str = ""
    last_name: str = ""
    country: str = ""
    language: str = "de"
    addresses: List[Dict] = field(default_factory=list)


@dataclass
class InvoiceLine:
    sku: str
    description: str
    quantity: int
    net_unit_price: float
    vat_rate: float


@dataclass
class Invoice:
    invoice_id: str
    order_id: str
    customer_id: str
    currency: str = "EUR"
    lines: List[InvoiceLine] = field(default_factory=list)
    status: str = "DRAFT"


@dataclass
class CreditNote:
    credit_note_id: str
    invoice_id: str
    reason: str
    amount_net: float
    amount_vat: float
    status: str = "DRAFT"
