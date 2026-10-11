# Security Review

Scope: isolated software-completion slice. No production attack testing.

## Controls verified in this session

| Control | Result | Evidence |
| --- | --- | --- |
| Sales lock | closed | `isSalesEnabled() === false`; product activation `allowed: false` |
| Product SoT | closed | health flag false; ACTIVE create throws |
| Guardian on execute | deny | unauthorized `supplier.order.submit` / `prices.update` |
| Approval cannot unlock sales | held | approval bind test; sales still locked |
| Customer isolation | held | tracking + `assertOwnOrder` deny other customer |
| Customer tracking route | session required | `requireCustomer` in plugin |
| Admin software routes | auth + RBAC | `requireAuth` + `ai.read` |
| Secret scan in payloads | deny | Guardian secret keys |
| Health redaction | held | JSON must not match `sk-` / private key |
| Financial retry | not auto | `classify(payment.refund).retryable === false` |
| Undercut rule | not added | `MARKET_UNDERCUT_IMPLEMENTED === false` |

## `npm run security:check`

Exit 0 with **2 warnings** (pre-existing, not introduced here):

1. Frontend `npm audit` high/critical in Next/sharp/vitest/braces/js-yaml/postcss (dependency estate).
2. Contact form time-trap missing.

Server `npm audit` reported 0 vulnerabilities.

This slice did **not** force-upgrade Next/vitest to chase audit numbers (breaking). That remains remaining work.

## Issues classified

| Severity | Finding | Action |
| --- | --- | --- |
| HIGH | Frontend dependency CVEs (Next RCE advisories, tinypool, sharp) | Tracked, not silently patched with `--force` |
| MEDIUM | Contact time-trap missing | Pre-existing; not in this diff |
| MEDIUM | Many admin plugins still need per-route RBAC review | Out of this slice except new software routes |
| LOW | Voice/Python leftovers could confuse operators | Health marks voice BLOCKED |

## Not done (and must not be claimed)

- Production pentest.
- Secret rotation.
- Enabling sales or SoT to "test" security.
- Writing credentials into docs or commits.
