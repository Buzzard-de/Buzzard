# Commerce Readiness Gate (Part 8)

## Endpoint

- Public: `GET /api/commerce/readiness`
- Admin: `GET /api/admin/commerce/readiness`
- Health: `GET /api/health/commerce`

## Checks

AUTH, RBAC, SECURITY, PRODUCT, CATEGORY, PRICE, STOCK, SUPPLIER, SHIPPING, TAX, PAYMENT, CHECKOUT, ORDER, WEBHOOK, IDEMPOTENCY, LOGGING, MONITORING, BACKUP, DISASTER_RECOVERY, LEGAL, GDPR, SEO, PERFORMANCE, SALES_GATE

## Statuses

- Check: `PASS` | `WARNING` | `FAIL` | `UNKNOWN`
- Overall: `READY` | `NOT_READY` | `BLOCKED`

## Sales activation

Sales may only activate when:

1. Readiness = `READY`
2. Security checks pass
3. Critical blockers = 0
4. Integrations healthy
5. Admin explicit approval
6. **Production safety lock released** (manual env change)

Part 8: `goLiveApproval.approveGoLive()` does **not** set `BUZZARD_SALES_ENABLED=1`.
