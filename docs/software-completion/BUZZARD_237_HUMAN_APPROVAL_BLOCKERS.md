# Buzzard 237 — Human approval and external blockers

Date: 2026-10-14  
Register: `BUZZARD_237_MASTER_EXECUTION_REGISTER.md` (canonical per-item states)  
No production changes, purchases, listings, or secret rotation were performed.

Standing locks (must remain until an independent authenticated human approves the exact action):

| Flag | Workspace | Required to change |
| --- | --- | --- |
| `BUZZARD_SALES_ENABLED` | `0` | Independent human approval of commercial sales activation |
| `BUZZARD_PRODUCT_SOT_ACTIVE` | unset; software `productSourceOfTruthActive: false` even if env were `1` | Separate SoT activation approval; identity mapping; production migration |
| `BUZZARD_LIVE_PAYMENTS` | unset; effective false without sales | Sales **and** live-payments approval; provider credentials |

## Human approval required (item numbers)

| Item | Action | Risk | Why it stays pending |
| --- | --- | --- | --- |
| 67 | PIM live publish | High | Publish is not SoT, but is customer-visible catalog mutation |
| 73 | Product SoT activation | Critical | Dual-write forbidden; activation is a separate human gate |
| 115 / 129 | Marketplace live listing / publish | High | Irreversible external marketplace effect |
| 155 / 165 | Customer notification send | Medium–High | External customer-facing message |
| 182 | High-impact catalog (sales, SoT, live pay, PO, listing, ship, deploy) | Critical | AI cannot approve itself |
| 213 | Production environment configuration | Critical | Production config change |
| 214 | Production deploy | Critical | Irreversible release |
| 219 | Go-live approval execution | Critical | `goLiveApproval` must not be self-approved |
| 221 | Live DNS / access policy | Critical | Not touched |
| 225 | First real customer order | Critical | Real money / fulfillment |
| 226 | Merge to protected production branch | Critical | Feature-branch PR is not a merge |

## External / credential blockers

| Item | Blocker | Verification still required |
| --- | --- | --- |
| 87 | Inter-Cars live credentials / authorization | Authorized sandbox then live |
| 88 | TecDoc live credentials | Authorized sandbox then live |
| 185 | Alerting backend | Configured destination. Local `generateLocalAlerts()` is implemented (`liveDispatch: false`). Remaining human/external action: authorize SMTP/webhook/pager credentials. Do not treat local generation as live delivery. |
| 205 / 212 | GitHub CI for this HEAD vs PR #430 | Independent CI on the pushed SHA |
| 217 | Production monitoring probe | Authorized production access |
| 220 | Production persistent disk | Independent production evidence — local DB copy is not proof |

## Marketplace channels classified not implemented (live adapters)

Items 123–127: OTTO, eMAG, Skroutz, bol.com, Cdiscount — **classification-only software** now exists (`MARKETPLACE_CHANNELS`, `PUBLISH_BLOCKED`, unit coverage). They are **not** live adapters. Item 129 (live listing/publish) remains HUMAN_APPROVAL_REQUIRED. Hub enable/sync/webhook is 409 while `BUZZARD_SALES_ENABLED` is not 1.

## Explicitly not executed

- Live Stripe/PayPal charges or refunds
- Supplier purchase orders
- Carrier label purchase (`purchaseLabel` returns `LABEL_PURCHASE_BLOCKED` even if env keys exist)
- Production secret rotation
- `git reset --hard` / `git clean -fd`
- Disabling rate limits, CSRF, CORS, auth, or finance 409 gates
- Autonomous Esat Bey destructive containment

Approvals must be independent, authenticated, scoped, time-bound, auditable, and bound to the exact input hash. Silence is not consent.
