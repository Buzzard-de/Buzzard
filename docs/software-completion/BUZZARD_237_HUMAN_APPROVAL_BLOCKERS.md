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
| 73 | Product SoT activation | Critical | Dual-write forbidden. Local refuse: env flag and forceActivate do not activate software SoT. Real cutover still requires independent human approval |
| 115 / 129 | Marketplace live listing / publish | High | Irreversible external marketplace effect. Local 115: draft-only; vendor listing ids rejected; activateDraft blocked. Live listing still pending independent approval |
| 155 / 165 | Customer notification send | Medium–High | External customer-facing message. Local 155: provider ids rejected; approveSend does not send; PROVIDER_ACCEPTED not written. Live send still requires independent approval |
| 182 | High-impact catalog (sales, SoT, live pay, PO, listing, ship, deploy) | Critical | AI cannot approve itself |
| 213 | Production environment configuration | Critical | Local refuse: inspect is presence-only; apply does not write process.env. Live production config still requires independent human approval |
| 214 | Production deploy | Critical | Local refuse: hook presence ≠ deploy; trigger does not HTTP. Live release still requires independent human approval |
| 219 | Go-live approval execution | Critical | Local refuse: goLiveGate does not approve or enable sales; commerce AI approve is denied. Live go-live still requires independent human approval |
| 221 | Live DNS / access policy | Critical | Local refuse: token present ≠ DNS write; apply does not HTTP. Live DNS still requires independent human approval |
| 225 | First real customer order | Critical | Local refuse: firstOrderGate does not create, charge, or fulfill. Live first order still requires independent human approval |
| 226 | Merge to protected production branch | Critical | Local refuse: protectedBranchMergeGate does not run git/gh. Feature-branch PR #431 is not a merge |

## External / credential blockers

| Item | Blocker | Verification still required |
| --- | --- | --- |
| 87 | Inter-Cars live credentials / authorization | Adapter classified locally (`inter_cars` inventory, `live: false`). Authorized sandbox then live still required |
| 88 | TecDoc live credentials | Authorized sandbox then live |
| 185 | Alerting backend | Configured destination. Local `generateLocalAlerts()` is implemented (`liveDispatch: false`). Remaining human/external action: authorize SMTP/webhook/pager credentials. Do not treat local generation as live delivery. |
| 205 / 212 | GitHub CI for this HEAD vs PR #430 | Evidenced 2026-10-17: SHA `c4a6e4e`, run `39032743095` SUCCESS on #431 (base `main`) and the same checks on #430. Do not merge. Optional later: retarget #430 to `main`. |
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
