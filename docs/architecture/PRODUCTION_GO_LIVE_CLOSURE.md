# Production Go-Live Closure

Canonical closure over existing SoT, OMS, approvals, and the Go-Live Gate. Sales stay off.

- Order SoT: `commerce_orders` via `canonicalOrderFacade` (not `orders.json`)
- Product SoT: existing Product Engine / `product_engine`
- Sales: `BUZZARD_SALES_ENABLED=1` is not enough; production ignores `BUZZARD_SALES_GATE_BYPASS`
- Eligible only when all 13 closure checks PASS **and** a human `GO_LIVE_PRODUCTION` approval exists
- Activation is never automatic

`GET /api/admin/system/go-live/closure` returns `{ eligible, salesEnabled, checks, failedChecks }`.
