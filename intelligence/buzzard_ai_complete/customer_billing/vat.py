from dataclasses import dataclass


@dataclass
class TaxResult:
    net: float
    vat: float
    gross: float
    rate: float


def calculate_vat(net_amount: float, vat_rate: float) -> TaxResult:
    if net_amount < 0:
        raise ValueError("net_amount_must_not_be_negative")
    if vat_rate < 0:
        raise ValueError("vat_rate_must_not_be_negative")
    vat = round(net_amount * vat_rate / 100.0, 2)
    return TaxResult(round(net_amount, 2), vat, round(net_amount + vat, 2), vat_rate)
