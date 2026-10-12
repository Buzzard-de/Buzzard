# AI Agent Status

All agents below are registered in `server/lib/pusat/agents.js` and seeded into `core_ai_employees` when missing. They are recommendation engines unless a later authorized workflow is invoked. None call a live LLM (`BUZZARD_AI_PROVIDER` default = `stub`).

| Agent | Employee id | Engine binding | Permissions | External provider | Test | Status |
| --- | --- | --- | --- | --- | --- | --- |
| Price Assistant | `price_ai` | `server/lib/pricing.js` | products.read, prices.read, ai.execute | None (rules) | Yes | Complete for recommendation path. Never invents supplier cost. Enforces €0.50 min net profit check. Reports €0.10 undercut as NOT_IMPLEMENTED. |
| Stock Assistant | `stock_ai` | `server/lib/operations/stockEngine.js` | products.read, ai.execute | None | Yes | Complete for fail-closed analysis. Unknown/stale/blocked stock cannot be claimed available. |
| SEO Assistant | `seo_ai` | Content gap rules | products.read, ai.execute | LLM blocked | Yes | Complete for gap proposals. Does not fabricate specifications or change canonical identity. |
| Customer Assistant | `customer_ai` | `orders` table read | orders.read, ai.execute | Messaging blocked | Yes | Complete for classify/draft/escalate. Will not claim status without a row. Will not issue refunds. |
| Sales Analysis Assistant | `sales_ai` | `orders` aggregates | orders.read, ai.execute | None | Yes | Complete for actual figures. Missing margin/return series are marked unavailable, not estimated. |
| Category Assistant | `category_ai` | `taxonomyUnification.js` | categories.read, ai.execute | None | Yes | Complete for resolve/flag-ambiguous. Multilingual mapping is flagged when locale/translations are present; not a full translator. |
| Product Assistant | `product_ai` | `pim/productValidation.js` | products.read, ai.execute | None | Yes | Validation only. Activation blocked while sales are locked. |
| Order Assistant | `order_ai` | `salesMode.js` | orders.read, ai.execute | Supplier PO blocked | Yes | Readiness/proposal only. Real PO remains disabled. |
| Doğu Bey | `dogu_bey` | Structured research records + memory | ai.execute, products.read | Live research APIs blocked | Yes | Organizes facts vs hypotheses and sources. Does not scrape the web. |
| Esat Bey | `esat_bey` | Local Guardian `evaluate` | security.read, security.alert, ai.execute | Remote Guardian URL optional | Yes | Gates the real `executeTask` path. Not an isolated demo endpoint. |
| Aslan Bey | `aslan_bey` | Triage/routing only | ai.read, ai.execute, products.read, orders.read | None | Yes | Coordinator. Does not duplicate specialist work or execute side effects. |

Existing default employees (`product_ai`, `price_ai`, `category_ai`, `order_ai`, `security_ai`) were preserved. Specialists were added with `INSERT OR IGNORE`.

## Request / response shape

Every agent returns a structured object:

```json
{
  "ok": true,
  "agent": "price_assistant",
  "invented": false,
  "evidence": {},
  "recommendations": [],
  "reviewRequired": false
}
```

Schema failures return `{ ok: false, error: "schema_invalid", errors: [...] }`.
