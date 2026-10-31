# AI & Automation — Blockers

Do not treat these as completed.

## External credentials / accounts

| Dependency | Env / control | Effect | Status |
| --- | --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` + `BUZZARD_AI_PROVIDER=openai` | Live generation | **BLOCKED** — adapter returns `provider_not_implemented` |
| Anthropic | `ANTHROPIC_API_KEY` | Live generation | **BLOCKED** — same |
| Google AI | `GOOGLE_AI_API_KEY` | Live generation | **BLOCKED** — same |
| Remote Guardian service | `BUZZARD_GUARDIAN_URL` | Python Guardian HTTP | **BLOCKED** for remote; local Guardian works without it |
| Remote Orchestrator service | `BUZZARD_ORCHESTRATOR_URL` | Python orchestrator HTTP | **BLOCKED** — Pusat does not need it; health reports unconfigured |
| Live supplier | adapter credentials + existing safety flags (`REAL_SUPPLIER_LIVE_IMPORT`) | Real import / PO | **BLOCKED** — mock adapter only in this repo path |
| Payments | Stripe/PayPal live keys + sales unlock | Charges/refunds | **BLOCKED** — out of scope; not invoked |
| Customer messaging | Twilio / mail provider | Send replies | **BLOCKED** — drafts only |
| Marketplace publish | channel credentials | Live listings | **BLOCKED** |

## Policy / product blockers (intentional)

| Item | Why |
| --- | --- |
| Sales lock | `BUZZARD_SALES_ENABLED` is not `1`. Order automation and product activation stay fail-closed. This task must not flip the flag. |
| Product Source of Truth | Not activated. Product automation does not write catalog rows. |
| €0.10 market undercut | Missing from `server/lib/pricing.js`. Agents report `implemented: false`. Implementing it would change live price math and was not done here. |
| `productValidator.validateCustoms` | Function is missing. Customs automation catches the throw and requires human review. |

## Verification blockers

| Item | Why |
| --- | --- |
| Production persistence of new tables | New migrations run when the API process loads `db.js`. Production was not deployed or inspected. |
| Process-restart memory proof | Tests prove SQLite writes; they do not kill the Node process. |
| CI green on GitHub | Workflow updated; Actions result not observed in this session. |
| Full `npm run test:unit` | Only `test:ai` was executed. |

## What is required to unblock live AI

1. Choose and implement one provider in `aiProviders.executeWithProvider` (not stub).
2. Store the key as a secret; never in AI memory or logs.
3. Keep Guardian + approval in front of any tool that can mutate commerce.
4. Do **not** treat provider connectivity as “AI complete” until production health and a supervised dry-run exist.
