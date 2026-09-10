# Buzzard Returns & Refund Engine

Critical financial and operational foundation for customer returns, supplier recovery, and financial reconciliation.

**Does NOT implement real payment refunds, supplier refunds, marketplace refunds, carrier APIs, or legal automation.**

Built on: Product, Supplier, Pricing, Inventory, Order, Marketplace, and Market engines.

## Critical Business Principle

Buzzard is the seller toward the customer/marketplace but must **NOT** assume supplier reimbursement.

Financial chain (explicit and auditable):

```
Customer / Marketplace Refund
  → Buzzard Refund
  → Supplier Return
  → Supplier Credit / Supplier Refund
  → Return Shipping
  → Marketplace Refund / Fees
  → Other Costs
  → Final Buzzard Loss / Profit
```

## Architecture

```
Return Request → Eligibility → Authorization → Shipment → Receipt
  → Supplier Return → Supplier Recovery → Customer Refund
  → Marketplace Refund → Financial Reconciliation → Final Impact
```

## Estimated vs Actual

- **Pricing Engine return reserve** = expected risk (estimate)
- **Returns Engine financial impact** = actual outcome
- **Supplier reimbursement** must never be assumed unless actually confirmed/received
- Approved credit ≠ cash received

## Final Order Contribution

```
originalOrderMargin - returnImpact = finalOrderContribution
```

Historical order margin snapshots are never overwritten.

## Inventory

Returned products do **not** automatically become saleable inventory.

## Security

Server-controlled: supplier recovery, refund amounts, buzzard impact, status, reconciliation.

Customer isolation enforced.

## Not Implemented

Real payment/supplier/marketplace refunds, carrier APIs, return labels, legal automation, AI decisions, auto-restock.
