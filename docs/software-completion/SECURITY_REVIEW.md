# Security Review

Scope: isolated software-completion slice plus verification fixes. No production attack testing.

## Controls verified in this session

| Control | Result | Evidence |
| --- | --- | --- |
| Sales lock | closed | `salesEnabled:false` on health + commerce overview |
| Product SoT | closed | health flag false; ACTIVE create throws |
| Guardian on execute | deny | unauthorized `supplier.order.submit` / `prices.update` |
| Approval cannot unlock sales | held | approval bind test; sales still locked |
| Customer isolation | held | tracking + `assertOwnOrder` + cart IDOR e2e |
| Guest cart | held | no customerId → no unauth IDOR false positive |
| Customer tracking route | session required | `requireCustomer` in plugin |
| Admin software / commerce / PIM routes | auth + RBAC | unauthenticated 401; bearer 200 |
| Secret scan in payloads | deny | Guardian secret keys |
| Health redaction | held | JSON must not match `sk-` / private key |
| Financial retry | not auto | `classify(payment.refund).retryable === false` |
| Price / coupon tamper | held | commerce-security Playwright |
| Commercial checkout | blocked | attempt returns `blocked:true`, `commercialOrders:0` |
| Returns execution | not executed | ledger `customer_refund_executed=0`; no assumed supplier credit |
| Isolated cart fixture | READY/PUBLIC only | not ACTIVE; sales remain off |
| Undercut rule | not added | `MARKET_UNDERCUT_IMPLEMENTED === false` |

## `npm run security:check`

Previously exit 0 with **2 warnings** (pre-existing): frontend `npm audit` and contact form time-trap. GitHub Actions skipped it on `25a48da` because `test:unit` failed first. On `7f81585` run 38144084891 and `a2879e4` run 38150381530, `security:check` completed **SUCCESS**.

## Issues classified

| Severity | Finding | Action |
| --- | --- | --- |
| HIGH | Frontend dependency CVEs (Next RCE advisories, tinypool, sharp) | Tracked, not silently patched with `--force` |
| MEDIUM | Contact time-trap missing | Pre-existing; not in this diff |
| MEDIUM | Many admin plugins still need per-route RBAC review | Out of this slice except exercised admin routes |
| LOW | Voice/Python leftovers could confuse operators | Health marks voice BLOCKED / NOT_CONFIGURED |
| LOW | Admin Control Center UI session on static export | Not treated as a security bypass; APIs still require auth |

## Not done (and must not be claimed)

- Production pentest.
- Secret rotation.
- Enabling sales or SoT to "test" security.
- Writing credentials into docs or commits.
- A complete security audit merely because `security:check` previously returned SUCCESS with warnings.
