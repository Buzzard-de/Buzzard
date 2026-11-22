# Production readiness

Date: 22 November 2026. `productionReady` was not changed. It remains false. Sales remain locked. Egress remains deny.

Overall status: NOT_READY.

| Area | Status | Evidence |
|---|---|---|
| Production configuration | NOT_READY | Phase gates keep `completeClaim` false and `live` false. |
| Environment variables | UNKNOWN_UNVERIFIED | Names exist in code. The production host was not inspected. |
| Secrets | READY_WITH_LIMITATIONS | Local redaction and webhook secret checks exist. The production secret store was not opened. |
| Database migrations | UNKNOWN_UNVERIFIED | Migration files exist. They were not applied to a production database. |
| Database backup | READY_WITH_LIMITATIONS | Local backup locks exist. A production backup was not taken. |
| Restore test | NOT_READY | No production restore was performed. |
| Monitoring | READY_WITH_LIMITATIONS | Local health snapshots exist. Live paging was not proven. |
| Logging | READY_WITH_LIMITATIONS | Security and audit logs exist locally. |
| Alerting | NOT_READY | Live dispatch is coded as false. |
| Error tracking | READY_WITH_LIMITATIONS | Public error keys exist. No external tracker was queried. |
| Incident management | READY_WITH_LIMITATIONS | Esat local incident classification exists. No live incident drill was run. |
| CI/CD | UNKNOWN_UNVERIFIED | This pass did not read a green production pipeline. |
| Deployment | NOT_READY | No deploy was performed. |
| Rollback | NOT_READY | No rollback drill was performed. |
| Domain | UNKNOWN_UNVERIFIED | Not probed. |
| SSL | UNKNOWN_UNVERIFIED | Not probed. |
| CDN | BLOCKED_EXTERNAL | Storefront live CDN checks stay blocked in the phase gates. |
| Rate limiting | READY_WITH_LIMITATIONS | Local limiter tests exist. Production store was not measured. |
| Payment security | READY_WITH_LIMITATIONS | Capture and refund return 403 while sales are locked. |
| Supplier connectivity | BLOCKED_EXTERNAL | Adapters are dry. Submit is blocked. |
| Logistics connectivity | BLOCKED_EXTERNAL | Label purchase returns a human gate. |
| Customer support | BLOCKED_EXTERNAL | Live inbox is blocked. |
| Legal compliance | UNKNOWN_UNVERIFIED | Code is not a legal opinion. HUMAN_REVIEW_REQUIRED. |
| GDPR | UNKNOWN_UNVERIFIED | Export and delete routes exist and deletion is human-gated. Lawful basis was not reviewed. |
| Operational documentation | READY_WITH_LIMITATIONS | Many runbooks exist. A document is not a finished operation. |

No row is READY. A READY_WITH_LIMITATIONS row is a local control, not a production sign-off.
