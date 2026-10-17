# Buzzard 237 — Test evidence

Date: 2026-10-15  
Branch: `cursor/software-completion-local-c293`  
Starting HEAD this pass: `bfc4265`

Safety:

- `BUZZARD_SALES_ENABLED=0`
- SoT / live payments unset
- `:3000` and `:3001` left running
- Original 237 checklist UNKNOWN — score NOT FULLY AUDITABLE
- No LIVE_VERIFIED / production RESTORE_TESTED

## Commands

| Command | Exit | Totals |
| --- | --- | --- |
| Focused vitest HAC/fail-closed | 0 | 26 passed |
| `npx vitest run` | 0 | 113 files, **1084 passed** |
| `npx tsc --noEmit` | 0 | clean |
| account lint | 0 | clean |
| `NODE_ENV=production npx next build` | 0 | 2044 pages; `:3000` 200 |
| Playwright API suite (security+storefront+readiness) | 0 | **12 passed** |
| Full Playwright UI suite | not run | journey/admin/viewports skipped |

Percentages **unchanged**: Esat 83.73%, Buzzard 73.90%.

## Local trial 2026-10-16 (HEAD after `86e799e` tests)

Safety: sales/SoT/live payments off. No `npm audit fix --force`. No merge of #431. Items 87/88/185 unchanged.

| Command | Exit | Totals |
| --- | --- | --- |
| `npx vitest run` rateLimitStore + a11y landmarks + localMetricsAlerts + backupRestoreIntegrity + carrierLabelPurchase | 0 | 5 files, **15 passed** |
| `npm run security:audit` (`--audit-level=high`) | 1 | 5 high: `braces` via `eslint-config-next` / micromatch / fast-glob. Force upgrade refused. |
| `npm run test:backup-restore` | 0 | dry-run `server/data/buzzard.db` (16543744 bytes) → `server/data/test-scratch/phase11-unit.db` |
| `npm run diagnostics:providers` | 0 | `secretsIncluded: false`, `attempted: false`, `live: 0` |

Register mean after this trial: **75.76%** (17955/237; one decimal **75.8%**). VERIFIED_100 remains 0.

## 2026-10-17 morning — items 87 / 88 local honesty

| Command | Exit | Totals |
| --- | --- | --- |
| `npx vitest run server/__tests__/externalIntegrationHonesty.test.mjs` | 0 | 2 passed (key present ≠ live HTTP; Inter-Cars `LIVE_PO_BLOCKED`) |

Register mean after this pass: **75.91%** (17991/237; one decimal **75.9%**). 87 and 88 remain BLOCKED_EXTERNAL. 185 unchanged. VERIFIED_100 remains 0.

## 2026-10-17 infrastructure advancement day

Push/PR/deploy **not** executed (operator command). Sales/SoT/live payments off.

| Command | Exit | Totals |
| --- | --- | --- |
| infrastructureAdvancementDay.test.mjs | 0 | 7 passed |
| softwareCompletion + lifecycle + secureCommerce + dualPayment + softwareMasterCompletion | 0 | 129 passed |
| pusatOrchestrator + memory/guardian + approval + agents + worker | 0 | 44 passed |
| localMetricsAlerts + rateLimitStore | 0 | 10 passed |

Item **154** 40→55. Mean **75.97%** (18006/237). VERIFIED_100 0. Live GPS/calls/listings not claimed.

## 2026-10-17 Buzzard 80 next round

Push/PR/deploy **not** executed. 80% **not** reached.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzard80NextAdvancement + searchIndexHonesty + marketEngine | 0 | 22 passed |
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | no warnings |

Mean **76.29%** (18080/237). LIVE_VERIFIED 0.

## 2026-10-17 Buzzard 80 master advancement

Push/PR/deploy **not** executed. Numbered 80-item plan **not found**. 237 mean **unchanged**.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzard80MasterAdvancement + pusatApprovalExceptions + buzzard80NextAdvancement | 0 | 3 files, **17 passed** (after duplicate-locale fix) |
| infrastructureAdvancementDay + externalIntegrationHonesty | 0 | 2 files, **9 passed** |
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | no warnings |
| Playwright | not run | did not touch :3000 |

Mean **76.29%** (18080/237). LIVE_VERIFIED 0. 80-plan % **not computable**.

## 2026-10-17 record sprint

Push/PR/deploy **not** executed. Numbered 80-item plan still **not found**.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzardRecordSprint + carrierLabelPurchase + buzzard80MasterAdvancement + externalIntegrationHonesty | 0 | 4 files, **12 passed** |
| softwareCompletion filtered supplier/marketplace/shipping/return | 0 | **8 passed**, 64 skipped |
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | no warnings |
| Playwright | not run | did not touch :3000 |

Mean **76.54%** (18141/237). LIVE_VERIFIED 0. Items 80/81/94/104/115 only.

## 2026-10-17 record sprint 2

Push/PR/deploy **not** executed.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzardRecordSprint2 + marketEngine | 0 | 2 files, **20 passed** |
| softwareCompletion + softwareReliabilityBatch + dualPaymentAdapters + infrastructureAdvancementDay | 0 | 4 files, **101 passed** |
| `npm run typecheck` | 0 | clean |
| `npm run lint` | 0 | no warnings |
| Playwright | not run | did not touch :3000 |

Mean **76.78%** (18198/237). LIVE_VERIFIED 0. Items 78/91/117/135/152. Previously raised 80/81/94/104/115/114/122/140/189/215/223 unchanged.

## 2026-10-17 item 205 / 212 GitHub CI

Push of SHA `c4a6e4ede4f0772a5e2b05069f0a0c2c73430b35` to `cursor/software-completion-local-c293`. Sales/SoT/live payments off. **#431 not merged.**

| Check | Result | URL |
| --- | --- | --- |
| `CI` / quality | SUCCESS | https://github.com/Buzzard-de/Buzzard/actions/runs/39032743095/job/117396353633 |
| `CI` / e2e-storefront | SUCCESS | https://github.com/Buzzard-de/Buzzard/actions/runs/39032743095/job/117396353697 |
| `CI` / e2e-admin | SUCCESS | https://github.com/Buzzard-de/Buzzard/actions/runs/39032743095/job/117396353690 |
| Workflow run | SUCCESS, 2m5s, `pull_request` | https://github.com/Buzzard-de/Buzzard/actions/runs/39032743095 |
| PR #431 checks | 3 SUCCESS, `headRefOid` = this SHA, base `main` | https://github.com/Buzzard-de/Buzzard/pull/431 |
| PR #430 checks | 3 SUCCESS, same SHA (commit-scoped; base still not `main`) | https://github.com/Buzzard-de/Buzzard/pull/430 |

237 mean **unchanged**. Items 205 and 212 stay PARTIAL (original criteria UNKNOWN, not VERIFIED_100).

## 2026-10-17 easiest remaining HUMAN items 165 / 182

No live send, publish, SoT, sales, payment, merge, or deploy.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzardHumanGatesEasy + buzzard80MasterAdvancement | 0 | 2 files, **6 passed** |
| softwareCompletion `-t message` | 0 | **2 passed**, 70 skipped |

**165** 50→60. **182** 60→70. Status both HUMAN_APPROVAL_REQUIRED. Mean **76.87%** (18218/237). LIVE_VERIFIED 0.

## 2026-10-17 HUMAN items 67 / 129

No live PIM visibility mutation via `software.pimPublish`. No marketplace listing write.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzardHumanGatesEasy + buzzard80NextAdvancement | 0 | 2 files, **8 passed** |

**67** 40→52. **129** 50→58. Both HUMAN_APPROVAL_REQUIRED. Mean **76.95%** (18238/237). LIVE_VERIFIED 0.

## 2026-10-17 HUMAN item 115 listing model (no live listing)

No marketplace write, no invented vendor listing id, no activate-to-live.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzardHumanGatesEasy + buzzardRecordSprint + marketplaceClassification | 0 | 3 files, **12 passed** |
| softwareCompletion `-t marketplace` | 0 | **3 passed**, 69 skipped |

**115** 55→64. Stays HUMAN_APPROVAL_REQUIRED. **129** unchanged at 58%. Mean **76.99%** (18247/237). LIVE_VERIFIED 0.

## 2026-10-17 HUMAN item 155 notification draft (no live send)

No customer message send, no invented provider message id, no PROVIDER_ACCEPTED write.

| Command | Exit | Totals |
| --- | --- | --- |
| buzzardHumanGatesEasy + notificationHub | 0 | 2 files, **8 passed** |

**155** 55→64. Stays HUMAN_APPROVAL_REQUIRED. **165** unchanged at 60%. Mean **77.03%** (18256/237). LIVE_VERIFIED 0.
