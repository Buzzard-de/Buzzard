# Security and compliance

Date: 22 November 2026. No exploit was run. No secret value was printed. Legal compliance is not declared from code.

| Control | Code | Local test known | This pass |
|---|---|---|---|
| Authentication | JWT and scrypt passwords | Yes, older files | Not rerun |
| Authorization and RBAC | Route matrix | Yes | Not rerun |
| API keys and secrets | Redaction, webhook secret length | Yes | Not rerun |
| Encryption at rest for all product data | Not live | Tests assert the claim stays modest | Not rerun |
| Audit log | Security log | Yes | Not rerun |
| Rate limit | Yes | Yes | Not rerun |
| Input validation | Yes | Phase 17 bundle | Not rerun |
| Webhook signatures | `webhookGate.js` | `webhookSecurity.test.mjs` | Not rerun today. Earlier in this branch the finance cases passed. |
| SQL parameters | Queries use placeholders | No dedicated injection test found | Not claimed as a full injection proof |
| XSS | CSP and headers | No DOM XSS suite found | Partial |
| CSRF | `csrf.js` | `csrf.test.mjs` | Not rerun |
| SSRF | Egress deny | `egress42.test.mjs` | Not rerun. Policy was not changed. |
| Dependency vulnerabilities | `npm audit` script exists | No fresh report this pass | UNKNOWN_UNVERIFIED |
| Security headers | `security.js` | Phase 17 evidence | Not rerun |
| Backup | Local locks | Drill tests exist | Production restore not run |
| Incident response | Esat classifier | `esatBey.test.mjs` | Not rerun |
| Retention | Signal policy | One test | HUMAN_REVIEW_REQUIRED for the legal schedule |
| GDPR | Export route, gated delete | Part 19 test exists | HUMAN_REVIEW_REQUIRED |
| Sanctions | Fail-closed without a live list | Dev-list tests | Not a live screening feed |
| Cross-border requests | `authorityGate.js` | Master-command test | HUMAN_REVIEW_REQUIRED |
| IP logging | `getClientIp` | Auth tests | Not a lawful-basis review |

Customer data was not copied. Official data requests are not auto-approved by this code. EU-to-EU request handling is a procedure in code, not a lawyer's sign-off.

STATUS: READY_WITH_LIMITATIONS for the local gates that have tests. UNKNOWN_UNVERIFIED for legal compliance.
RISK LEVEL: P0 if sales, egress, or sanctions fail-open. They are fail-closed in this tree.
RECOMMENDED ACTION: Keep egress deny and the sales lock. Send the GDPR and sanctions design to a human reviewer before any live customer.
CONFIDENCE: High for the presence of the local gates. Low for any claim of legal completeness.
