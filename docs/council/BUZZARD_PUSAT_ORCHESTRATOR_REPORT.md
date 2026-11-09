# Pusat — 10 agent orchestration

`createRouter` now stores `kind`. Kinds: TAX_ANALYSIS, TAX_REPORT, VAT_CALCULATION, TAX_COMPLIANCE_REVIEW, CUSTOMS_ANALYSIS, HS_CLASSIFICATION, TARIC_CHECK, SANCTIONS_SCREENING, CUSTOMS_DUTY_CALCULATION, TRADE_COMPLIANCE_REVIEW.

`runImportToEuCustomer`: assign Tuncay + Nedim, collect reports, conflict if customs not clear, never COMPLETED.

Pusat action `TEN_AGENT_COUNCIL` (read-only, flag gated).
