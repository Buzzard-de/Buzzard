# Security Remediation Report

Timestamp: 2026-10-11T18:18:00Z  
Branch: `cursor/software-completion-c293`  
This is not a penetration test.

## Targeted remediations applied

| Package | Installed before | Installed after | Advisory | Why this was safe |
| --- | --- | --- | --- | --- |
| `vitest` (direct, **dev**) | 3.2.7 | **5.0.3** | GHSA-5gmw-xhrv-c9v3 / GHSA-85c8-ppgw-ccpr (tinypool RCE); GHSA-82fw-gwwq-j7x9 (`@vitest/mocker`) | Vitest 5 drops tinypool. Requires Node **≥22.12**. `.nvmrc` moved **20 → 22** for CI/dev tests only. App `engines` stay `>=20`. Production API does not run Vitest. |
| `vite` (direct, **dev**) | transitive | **7.3.7** | Vitest 5 peer | Explicit peer so Yarn/npm resolve is deterministic. |
| `postcss` (override) | 8.4.31 via Next | **8.5.29** | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 (`<=8.5.22`) | 8.x compatible override. `npm run build` passed. |
| `sharp` (override) | 0.34.5 via Next | **0.35.5** | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w (`<=0.35.5-rc.1`) | Smallest patched sharp. `npm run build` passed. |
| `source-map-js` (override) | 1.2.1 | **1.2.2** | GHSA-68fv-2mgg-jv7q | Patch release. |
| `js-yaml` (override) | 4.3.1 | **4.3.2** | GHSA-2883-xcg3-v3hh | Patch release. |
| `brace-expansion` (override) | ≤1.1.20 | **1.1.21** | GHSA-q2hr-2g5m-vwhr / GHSA-qhr7-859c-m2p7 | Patch on 1.x. |

`npm audit --omit=dev` is now **0 vulnerabilities**.  
`npm audit fix --force` was **not** used.

## Remaining advisories (honest)

| Package | Severity | Direct? | Production reachable? | Why not patched here |
| --- | --- | --- | --- | --- |
| `braces` 3.0.3 via `eslint-config-next` → `micromatch` → `fast-glob` | high | eslint-config-next is direct | **no** (dev lint only) | Advisory range is `*`. Suggested fix is **eslint-config-next 14.2.35**, incompatible with Next 15.5.27. No braces 3.x patch exists. |
| Contact time-trap | resolved | n/a | n/a | Hidden `_formStarted` + server fail-closed. |

## Application security (this pass)

- Production missing `BUZZARD_DB_PATH` fails closed; local default is not production storage.
- Production refuses ephemeral `/tmp` database creation.
- Provider diagnostics reject write URLs, private/invalid hosts, and production hosts; never open sockets; never print secrets.
- Contact anti-abuse and Guardian fail-closed remain.

## What was not performed

A penetration test was **not** performed.
