from decimal import Decimal


class LandedCostCalculator:
    def calculate(self, goods_value, freight=0, insurance=0, duty_rate=0, import_tax_rate=0, other_fees=0):
        goods = Decimal(str(goods_value))
        freight = Decimal(str(freight))
        insurance = Decimal(str(insurance))
        duty = Decimal(str(duty_rate))
        tax = Decimal(str(import_tax_rate))
        fees = Decimal(str(other_fees))
        customs_base = goods + freight + insurance
        duty_amount = customs_base * duty
        tax_base = customs_base + duty_amount
        import_tax = tax_base * tax
        landed = goods + freight + insurance + duty_amount + import_tax + fees
        return {
            "customs_base": str(customs_base.quantize(Decimal("0.01"))),
            "duty": str(duty_amount.quantize(Decimal("0.01"))),
            "import_tax": str(import_tax.quantize(Decimal("0.01"))),
            "other_fees": str(fees.quantize(Decimal("0.01"))),
            "landed_cost": str(landed.quantize(Decimal("0.01"))),
        }
