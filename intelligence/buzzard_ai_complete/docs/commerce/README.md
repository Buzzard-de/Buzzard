# Buzzard Commerce Engine

Commerce layer connected to the existing Buzzard AI project.

## Responsibilities
- Product catalog
- Supplier records
- Competitor price observations
- Market signals
- Profitability and pricing
- Inventory movements
- Shipping-rate quotes
- Orders
- Product decisions

## Decision rule
A product is only considered viable when its calculated net profit meets the configured minimum and its net margin meets the product target margin. The default minimum net profit is €0.50 and the default target margin is 7% for the commerce engine.

The engine does not invent supplier, competitor, marketplace, tax or shipping data. Real integrations must provide real observations.
