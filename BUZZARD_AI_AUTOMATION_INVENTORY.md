# BUZZARD — AI & Automation Inventory

**Date:** 2026-11-19 · **SALES=LOCKED** · **Pusat memory not touched**

## Architectures (three layers)

| Layer | Location | Wired to Node API? |
|-------|----------|-------------------|
| **Native AI core** | `server/lib/buzzardNative/**` | Yes — status, council, specialists, native engines |
| **AI Center (HTTP)** | `server/lib/aiCenter.js`, `aiCenterPlugin.js` | Yes — gated by `BUZZARD_AI_CENTER` + DB |
| **Legacy Python trees** | `intelligence/buzzard_ai_*` | **No** — parallel archives, placeholders |

## Agent roster (`identityRegistry.js` + expansions)

| Agent ID | Display | Exists | Real impl | Orchestrator | Tests | Voice | Central memory |
|----------|---------|--------|-----------|--------------|-------|-------|----------------|
| pusat | Pusat | Yes | Coordinator metadata | Yes | phase13 | NOT_CONFIGURED | namespace only |
| sinan_bey | Sinan Bey | Yes | Repo analysis hooks | Partial | native tests | NOT_CONFIGURED | Partial |
| esat_bey | Esat Bey | Yes | `esatBeyPlugin.js` | Partial | security tests | NOT_CONFIGURED | Partial |
| dogu_bey | Doğu Bey | Yes | Research stubs | Partial | NOT_VERIFIED | NOT_CONFIGURED | Partial |
| nedim_bey | Nedim Bey | Yes | Tax/finance refs | Partial | tax tests | NOT_CONFIGURED | Partial |
| tuncay_bey | Tuncay Bey | Yes | Logistics council | Partial | logistics tests | NOT_CONFIGURED | Partial |
| amelia, adrian, mira, leon | Council | Yes | Metadata CODE_READY | Partial | council tests | NOT_CONFIGURED | Partial |
| stock_ai (Çakır) | Specialist | Yes | `specialists/stockEngine.js` | Via dispatch | phase4 | N/A | Partial |
| category_ai (Pelin) | Specialist | Yes | `categoryEngine.js` | Via dispatch | phase2 | N/A | Partial |
| pricing_ai (Akın) | Specialist | Yes | `pricingEngine.js` | Via dispatch | phase5 | N/A | Partial |
| seo_ai | Specialist | Yes | `seoEngine.js` | Via dispatch | SEO tests | N/A | Partial |
| banu_hanim | Customer | Yes | `banuDesk.js` | Partial | phase12 | N/A | Partial |
| sales_analysis_ai | Sencer | Yes | `salesEngine.js` | Partial | analytics | N/A | Partial |
| zeynep_hanim | Textile | Yes | `zeynepEngine.js` | Partial | textile sandbox | N/A | Partial |

**Legend:** *Real impl* = executable JS beyond static JSON; *Partial* = sandbox/dry or metadata-only paths.

## Automation infrastructure

| Component | Path | Status |
|-----------|------|--------|
| Task / job queue | `jobQueue.js`, `jobWorker.js` | Implemented, dry jobs |
| Scheduler | `jobScheduler.js` | Implemented |
| Completion bus | `completionBus.js`, `syntheticCustomerJourney.js` | Integrated in ecosystem health |
| Exception bus | `exceptionBus.js` | Present |
| Price/stock queue | `priceStockQueue.js` | Present |
| Automation plugin | `automationPlugin.js` | HTTP + worker hooks |
| Guardian bridge | `guardianBridge.js` | Readiness only |
| Orchestrator bridge | `orchestratorBridgePlugin.js` | Status endpoints |

## Commerce engine ↔ AI mapping

From `engineRegistry.js` — each engine maps `specialist` field to agent id (all `live: false`).

## Voice & realtime

| Module | Status |
|--------|--------|
| `buzzardNative/speech/*` | Lab/sandbox TTS, official voice guard |
| `buzzardNative/realtime/*` | Session scaffold |
| `buzzardNative/engines/hearing.js` | STT pipeline stubs |
| Live telephony | **BLOCKED_EXTERNAL** |

## Human approval

Present in marketplace publish, supplier buy, payment capture paths (`HUMAN_GATE_REQUIRED`, `requireSalesEnabled`).

## Python intelligence folder

- **~400k+ lines** mostly under `intelligence/` (see statistics report).
- Hundreds of **empty `.gitkeep`** packages — classified as **scaffold, not runtime**.
- **Not imported** by `server/server.js`.

## Verdict

| Metric | Value |
|--------|------:|
| Named agents defined | **17+** |
| Agents with executable specialist engines | **~8** |
| Agents with live voice/memory | **0** |
| **AI/automation software completion (verified)** | **~45%** |
| **Live AI readiness** | **~8%** |