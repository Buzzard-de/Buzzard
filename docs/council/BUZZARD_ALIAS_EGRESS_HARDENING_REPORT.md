# Alias completion + network egress hardening

**Date:** 8 November 2026, 21:52 Europe/Berlin  
**Branch:** `cursor/buzzard-alias-egress-hardening-c293` (isolated, **not pushed**)  
**Parent:** `311260bb` on `cursor/buzzard-p0-p1-hardening-c293`  
**SoT:** MASTER AUDIT `97240313` + P0/P1 report  
**Egress policy file:** unchanged `"default": "DENY"`  
**Live network / DNS rebind / TLS / WAF:** not tested, not changed  

This is not LIVE.

---

## A. Branch ve commit bilgisi

| Item | Value |
| --- | --- |
| New branch | `cursor/buzzard-alias-egress-hardening-c293` |
| Base | `311260bb` |
| 17-agent | `674d9152` (ancestor) |
| Rollback | `git checkout cursor/buzzard-p0-p1-hardening-c293` |
| Push | not performed |

---

## B. Alias uyumluluk tablosu

| Incoming | Native | getAgent | Memory owner | Merged? |
| --- | --- | --- | --- | --- |
| `customs_ai` | `tuncay_bey` | native view, `requestedId=customs_ai` | `customs_ai` | **no** |
| `phone_ai` | `zeynep_hanim` | same pattern | `phone_ai` | no |
| `price_ai` | `pricing_ai` | same | `price_ai` | no |
| `customer_ai` | `banu_hanim` | same | `customer_ai` | no |
| `stock_ai` | itself / Çakır Bey | exact | `stock_ai` | n/a |
| `category_ai` | Pelin Hanım | exact | `category_ai` | n/a |
| `pricing_ai` | Akın Bey | exact | `pricing_ai` | n/a |
| `seo_ai` | Yılmaz Bey | exact | `seo_ai` | n/a |
| `sales_analysis_ai` | Sencer Bey | exact | `sales_analysis_ai` | n/a |
| unknown | — | `null` / `UNKNOWN_IDENTITY` | — | — |
| `finance_ai` | not 17-seed | `NOT_NATIVE_SEED` | — | not folded |

`SEED_IDS` length **17**, native ids unchanged. `getAgentExact("customs_ai")` remains **null** (no extra AGENTS row).

---

## C. getAgent() ve diğer erişim yolları

| Path | Result |
| --- | --- |
| getAgent | alias → native record + `requestedId`, `resolvedFromAlias`, `identitiesMerged:false` |
| registerAgent | `ALIAS_RESERVED` |
| unregisterAgent(alias) | `ALIAS_RESERVED` (does not delete Tuncay) |
| task assign | assignees native; `aliasRequests` + return `{requestedId, nativeId}` |
| routing / think | native id |
| permissions | native profile; DANGEROUS still gated |
| memory | separate namespaces; alias cannot read native personal/customs rows |
| council MEMBERS | still dual rows; `resolveMember` links without merge |
| API | `resolveAgentInput`; Pusat `SEVENTEEN_AGENT_COUNCIL` attaches `inputIdentity` |
| errors | unknown / members-only / alias-reserved distinct codes |

**CODE** yes · **TEST** 8 alias tests · **INTEGRATION** local Pusat action metadata · **LIVE** no · **SECURITY** gates not expanded

---

## D. 17 AI kimlik ve hafıza koruması

Native IDs unchanged. Official names unchanged from P0/P1. Alias and native **two stores**. Tuncay `hs_cn_taric` ≠ `customs_ai` `hs_cn_taric`.

---

## E. Python ağ erişimi denetimi

| File | Purpose | Host | Gate now? |
| --- | --- | --- | --- |
| `intelligence/security/guarded_fetch.py` | `guarded_urlopen` | policy | **yes** (new) |
| `buzzard_ai_complete/research/engine.py` | research fetch | caller URL | **yes** |
| `.../research/providers.py` | search provider | configured endpoint | **yes** |
| `.../production/preflight.py` | URL check | operator URL | **yes** |
| `buzzard_final_production_guard_max.py` | health/checkout/site | API/site env | **yes** |
| `intelligence/archive/*` and `buzzard_ki_gesamt/aktiv/*` copies | duplicates | same | **not rewritten** (archive/duplicate tree) |

Default production-guard API `http://localhost:3001` is **denied** by existing private-IP rule (fail-closed). That is not a policy loosen.

Python unit tests: **7/7** (was 6; +1 urllib deny). Not 6/6 anymore because a **new** test was added — Egress 4.4 policy file unchanged.

---

## F. Node ağ erişimi denetimi

| Item | Action |
| --- | --- |
| `scripts/lib/guardedScriptFetch.mjs` | new helper using existing `guardedFetch` |
| `scripts/*` smoke (`p1-smoke`, `part14-smoke`, `poll-render-until-live`, …) | **not auto-rewritten** | They target localhost or Render; localhost is private-denied. Rewriting would change operator smoke behaviour without a policy change. **Reported, not converted.** |
| `auto-render-if-ready.mjs` deploy hook POST | **not converted** (sensitive) |
| Node `egress44.test.mjs` | still **11** tests |

**CODE** helper · **TEST** helper deny without network · **LIVE** no

---

## G. Background job denetimi

`jobEgressGate.js` inspects explicit keys only: `outboundUrl`, `fetchUrl`, `webhookUrl`, `destinationUrl`, `callbackUrl`. Off-allowlist → `JOB_EGRESS_DENIED`, `reachedNetwork: false`. Catalog strings containing `https://` are **not** scanned (would break local import dry-run).

Job handlers themselves still do not raw-fetch.

---

## H. Subprocess riskleri

| Call | Network? |
| --- | --- |
| `nvidia-smi` | no |
| `git rev-parse` | no |
| backup `execSync` | local files; command string remains a review item |
| `python3` production-guard | child HTTP now via `guarded_urlopen` |
| `curl`/`wget`/`npm`/`pip` at runtime | `PACKAGE_MANAGER_RUNTIME_DENIED` / forbidden binary list — **not spawned** |

---

## I. npm/pip

`installTimeNetwork.js`: runtime policy npm/pip **false**. No install, upgrade, or delete this session.

---

## J. Egress test sonuçları (8 Nov 2026, ~21:52 Europe/Berlin)

| Suite | Result |
| --- | --- |
| Alias access paths | **8/8** |
| egressHardening45 | **4/4** |
| 17 / 10 / foundation | **3+7+7** |
| Phase 5–18 + handoff + runtime | **45/45** |
| egress44 Node | **11/11** (not 30) |
| special16 + idempotency | passed in prior combined set |
| Python egress | **7/7** (6 prior + urllib) |
| Live DNS/TLS/WAF | **not run** |

---

## K. Değiştirilen dosyalar

Alias: `identityRegistry.js`, `multiMemory.js`, `taskRouter.js`, `council.js`, `runtime.js`, alias tests.  
Egress: `guarded_fetch.py`, research engine/providers, preflight, production guard, `jobEgressGate.js`, `jobHandlers.js`, `scripts/lib/guardedScriptFetch.mjs`, subprocess/install-time modules, `egressHardening45.test.mjs`, Python test.

---

## L. Korunan dosyalar

Guardian sqlite; `egress_policy.v1.json`; SEED_IDS; Sinan voice; PR #492 / main; smoke scripts left as-is; archive Python urlopen; no package upgrades.

---

## M. Açık kalan güvenlik riskleri

1. Dozens of `scripts/*.mjs` still use raw `fetch` (operator tools).  
2. Duplicate `aktiv/` and `archive/` Python `urlopen`.  
3. backupAutomation command composition.  
4. Host firewall / Render WAF unverified.  
5. Job gate only explicit URL keys.  
6. `npm install` when a human runs it on a laptop is outside the app runtime.

---

## N. İnsan onayı gereken işlemler

Push; merge; deploy; live smoke against Render; converting remaining scripts (will deny localhost); WAF/firewall; package updates; any EUR; sales/payments.

---

| Work | CODE | TEST | INTEGRATION | LIVE | SECURITY |
| --- | --- | --- | --- | --- | --- |
| Alias completion | yes | 8 | Pusat metadata | no | no merge, no extra perms |
| Python urllib gate | yes (live trees) | 7 py | research/preflight/guard | no | DENY unchanged |
| Script helper | yes | 1 | unused by smokes | no | deny without net |
| Job URL gate | yes | 1 | executeJob | no | explicit keys only |
| npm/pip | policy module | 1 | none | n/a | no downloads |
