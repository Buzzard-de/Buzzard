# Buzzard Production Final Runbook

## A. Accounts / external services
- Payment provider business account + webhook secret
- Carrier accounts/contracts + API credentials
- Supplier API/XML/CSV credentials
- Amazon/eBay/Google marketplace credentials
- Telephony/SIP number + media streaming
- Realtime voice/AI provider
- Production hosting/cloud account
- DNS and TLS certificate

## B. Data
- Import canonical products into PIM
- Validate category mappings
- Validate EAN/GTIN/MPN/OE identifiers
- Validate supplier stock/price freshness
- Validate tax/VAT rules
- Validate shipping zones and rates

## C. Security
- Secret manager
- signed webhooks
- least-privilege credentials
- rate limits
- backups
- restore test
- audit logs
- incident response
- monitoring

## D. End-to-end
1. Product visible
2. Search works
3. Compatibility check works
4. Cart works
5. Checkout works
6. Payment succeeds
7. Order created exactly once
8. Inventory reserved
9. Supplier fulfillment or warehouse pick
10. Carrier label created
11. Tracking received
12. Customer notification
13. Delivery
14. Return/RMA
15. Refund

## E. Phone
Inbound number → signed webhook → call session → bidirectional audio →
realtime AI → product/order tools → spoken response → human handoff.

## F. Launch gate
No live activation until all external provider credentials, legal/tax settings,
security checks, backups, monitoring and end-to-end tests pass.
