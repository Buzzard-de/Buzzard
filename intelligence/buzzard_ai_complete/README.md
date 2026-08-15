# Buzzard AI COMPLETE vNext — Consolidated Workspace

Final **Alles-in-einem-Ordner**-Paket mit Orchestrator, Policy Gate, Metrics und Integration-Adaptern.

## vNext Erweiterungen

- **BuzzardPolicy** — defensive action gate (`core/policies.py`)
- **RateLimiter** — API rate limiting
- **Metrics** — in-memory counters
- **Integration adapters** — LLM mock, notifications, search base
- **Task scheduler** — async scheduled tasks
- **Docker** — `docker-compose.yml`, `deploy/docker/Dockerfile`

## o2 Erweiterungen (NOCH_FEHLENDE_FEHLERBEREINIGT)

- **97 Scaffold-Ordner** — vollständiger Architektur-Baum (agents, api, deploy, docs, …)
- **complete-tree** — Architekturbaum anzeigen
- **complete-inventory** — Projekt-Inventar
- **complete-verify** — pytest + Import-Sweep (fehlerfrei verifiziert)

## f1 Commerce Engine

- **Catalog, Pricing, Profitability** — Produktentscheidungen (SELL / TEST / REJECT)
- **Suppliers, Competitors, Market** — strukturierte Geschäftsdaten
- **Orders, Inventory, Logistics** — Bestell- und Lager-Grundlage
- **API** — `/commerce/products`, `/commerce/evaluate`

```bash
python3 main.py complete-commerce-demo
python3 main.py complete-commerce-evaluate --sku SKU-1 --price 79
```

## f2 Commerce GESAMT (Extension Scaffold)

- **30+ Commerce-Module** — marketplaces, payments, automotive/TecDoc, returns, tax, …
- **complete-commerce-scope** — vollständiger Commerce-Umfang
- **complete-commerce-tree** — Extension-Tree
- **complete-commerce-inventory** — Modul-Inventar

```bash
python3 main.py complete-commerce-scope
python3 main.py complete-commerce-inventory
```

## f3 Commerce FINAL REST (Integration Scaffold)

- **Integration-Scaffolds** — shipping (DHL/DPD/UPS/GLS/Hermes), marketplaces, suppliers, TecDoc, payments, tax, invoicing, sandbox
- **Operations** — backups, disaster recovery, observability, runbooks
- **commerce/risk/** — Risiko- und Compliance-Modul
- **complete-commerce-production-work** — verbleibende Produktionsarbeit
- **complete-commerce-integration-order** — empfohlene Integrationsreihenfolge

```bash
python3 main.py complete-commerce-production-work
python3 main.py complete-commerce-integration-order
```

## fehler_behebung_2 (Repair)

- **Pytest-Shadowing behoben** — `tests/commerce/__init__.py` und Unterpaket-Marker entfernt
- **complete-verify** — Import-Sweep überspringt `tests/` und `test_*`-Module
- **Dokumentation** — `docs/REPAIR_AND_FULL_TEST_REPORT.md`

## Logistics Engine v1 (Smart Shipping)

- **Smart Shipping Engine** — DHL, DPD, GLS, Hermes, UPS Carrier-Adapter
- **Prioritäten** — cheapest / balanced / fastest
- **complete-logistics-demo** / **complete-logistics-recommend** / **complete-logistics-docs**
- **API** — `POST /logistics/recommend`

```bash
python3 main.py complete-logistics-demo
python3 main.py complete-logistics-recommend --weight 2 --length 30 --width 20 --height 15 --country DE --postal-code 35075 --priority cheapest
```

## Order & Fulfillment Engine v1

- **OrderFulfillmentEngine** — Zahlung, Lagerreservierung, Lieferantenauswahl, Fulfillment
- **State Machine** — NEW → PAID → STOCK_RESERVED → FULFILLMENT_PENDING → …
- **Returns** — Rückgabe-Workflow mit validen Gründen
- **complete-order-demo** / **complete-order-process** / **complete-order-docs**
- **API** — `POST /orders/process`

```bash
python3 main.py complete-order-demo
python3 main.py complete-order-process --order-id O1 --customer-id C1 --sku SKU-DEMO --quantity 2 --price 10
```

## Customer Billing & Returns Engine v1

- **CustomerBillingEngine** — Kunden, Rechnungen, MwSt, Zahlungen, Refunds, Gutschriften
- **Reconciliation** — Zahlungsabgleich
- **Privacy** — Redaction-Helfer für sensible Felder
- **complete-billing-demo** / **complete-billing-refund** / **complete-billing-docs**
- **API** — `GET /billing/demo`, `POST /billing/refund`, `POST /billing/payment-status`

```bash
python3 main.py complete-billing-demo
python3 main.py complete-billing-refund --order-id O1 --reason defective --amount 10
```

## CRM & Customer Experience Engine v1

- **CRMEngine** — Events, Tickets, Reviews, Loyalty, Abandoned Cart, Segmentation
- **Customer 360° Snapshot** — aggregierte Kundensicht
- **CLV** — Customer Lifetime Value Berechnung
- **complete-crm-demo** / **complete-crm-segment** / **complete-crm-docs**
- **API** — `GET /crm/demo`, `POST /crm/segment`

```bash
python3 main.py complete-crm-demo
python3 main.py complete-crm-segment --ltv 1200 --orders 6
```

## Marketing & Advertising Engine v1

- **MarketingEngine** — Budget, Attribution, Google/Meta Ad Provider Adapters
- **Performance & Optimization** — ROAS evaluation, campaign recommendations
- **Compliance** — Consent gates for retargeting and profiling
- **complete-marketing-demo** / **complete-marketing-budget** / **complete-marketing-docs**
- **API** — `GET /marketing/demo`, `POST /marketing/budget`, `POST /marketing/campaign`

```bash
python3 main.py complete-marketing-demo
python3 main.py complete-marketing-budget --total 1000 --channels google_ads,meta_ads --weights google_ads:2,meta_ads:1
```

## MAXIMAL Platform Layer (VMAX + V2 add-ons)

- **BuzzardMaxPlatform** — Module registry, policy, audit, health
- **VMAX helpers** — Security, retries, idempotency, rate limiting, data quality, feature flags, product intelligence, decisions
- **V2 add-ons** — additive extensions in logistics, orders, billing, CRM, marketing (V1 intact)
- **complete-max-demo** / **complete-max-snapshot** / **complete-max-docs**
- **API** — `GET /vmax/demo`, `GET /vmax/snapshot`

```bash
python3 main.py complete-max-demo
python3 main.py complete-max-snapshot
```

## MAXIMAL One-Piece Control Center

- **ControlCenter** — Event bus, workflows, access control, integration status
- **End-to-End Plan** — Customer → Order → … → Audit lifecycle
- **complete-one-piece-demo** / **complete-one-piece-e2e** / **complete-one-piece-docs**
- **API** — `GET /control-center/demo`, `GET /control-center/e2e/{order_id}`

```bash
python3 main.py complete-one-piece-demo
python3 main.py complete-one-piece-e2e --order-id O1
```

## MAXIMAL Analytics & Business Intelligence

- **AnalyticsBIEngine** — KPIs, Dashboard, Alerts, Decision Intelligence
- **Profitability, Cohorts, Forecasting, Anomalies** — BI foundation
- **complete-analytics-demo** / **complete-analytics-docs**
- **API** — `GET /analytics/demo`, `GET /analytics/dashboard`

```bash
python3 main.py complete-analytics-demo
```

## Production MAX (Storefront Foundation)

- **Catalog, Cart, Checkout** — storefront lifecycle with profitability guard
- **Importers** — JSON, CSV, XML product ingestion
- **Provider adapters** — payment, shipping, eBay, Amazon, TecDoc (honest `NOT_CONFIGURED`)
- **Production readiness gate** — blocks go-live without payment/shipping/catalog
- **complete-production-demo** / **complete-production-readiness** / **complete-production-docs**
- **API** — `/production/*`, `/storefront/*`

```bash
python3 main.py complete-production-demo
python3 main.py complete-production-readiness
```

## Shop Intelligence Commerce Bridge MAXIMAL

- **ShopIntelligenceBridge** — Production catalog/checkout ↔ commerce events ↔ analytics hooks
- **SalesGate** — blocks sales until catalog, payment, shipping, pipeline and bridge are READY
- **OrderPipeline** — payment → fulfillment → shipping → delivery lifecycle
- **complete-shop-bridge-demo** / **complete-shop-bridge-readiness** / **complete-shop-bridge-docs**
- **API** — `/shop-bridge/readiness`, `/shop-bridge/demo`

```bash
python3 main.py complete-shop-bridge-demo
python3 main.py complete-shop-bridge-readiness
```

## Master Taxonomy MAXIMAL

- **43 Hauptkategorien** — hierarchisch bis Unter-Unterkategorie (1198 Knoten)
- **JSON + CSV** — PIM/ERP/import-ready unter `master_taxonomy/data/`
- **complete-taxonomy-demo** / **complete-taxonomy-search** / **complete-taxonomy-path**
- **complete-taxonomy-snapshot** / **complete-taxonomy-docs**
- **API** — `/taxonomy`, `/taxonomy/categories`, `/taxonomy/category/{id}`, `/taxonomy/search`

```bash
python3 main.py complete-taxonomy-demo
python3 main.py complete-taxonomy-search --q motor
python3 main.py complete-taxonomy-path --id 01.01.01
```

## Master Taxonomy Unification MAXIMAL

- **Canonical IDs** — `bz.01` … `bz.43` unify Shop (`cat-*`) and Intelligence (`01`/`intelligence.*`)
- **Alias mapping** — legacy IDs preserved, backward-compatible resolution
- **complete-taxonomy-unify-status** / **complete-taxonomy-unify-resolve** / **complete-taxonomy-unify-docs**
- **API** — `/taxonomy/status`, `/taxonomy/resolve`, `/taxonomy/canonical/*`

```bash
python3 main.py complete-taxonomy-unify-status
python3 main.py complete-taxonomy-unify-resolve --legacy-id cat-01 --system shop
```

## PIM Product Master MAXIMAL

- **Product Master** — SQLite schema, supplier import, deduplication, quality gate
- **Canonical categories** — requires `bz.*` category IDs
- **Multilingual** — de, en, tr, fr, ar
- **complete-pim-demo** / **complete-pim-health** / **complete-pim-schema** / **complete-pim-docs**
- **API** — `/pim/health`, `/pim/schema`, `/pim/import/process`, `/pim/validate`, `/pim/demo`

```bash
python3 main.py complete-pim-demo
python3 main.py complete-pim-health
```

## Multilingual Product Intelligence MAXIMAL

- **59 languages** — Europe, Nordic, Balkans, Arab (+ RTL)
- **Language detection** — normalize queries for cross-language product search
- **Glossary + AI pipeline** — synonym expansion, canonical entity linking
- **complete-multilingual-health** / **complete-multilingual-languages** / **complete-multilingual-normalize** / **complete-multilingual-demo** / **complete-multilingual-docs**
- **API** — `/multilingual/health`, `/multilingual/languages`, `/multilingual/normalize`, `/multilingual/glossary`, `/multilingual/demo`

```bash
python3 main.py complete-multilingual-demo
python3 main.py complete-multilingual-normalize --text "Bremsbelag"
```

## Supplier Import & Enrichment Engine MAXIMAL

- **Import pipeline** — normalize, identity, dedupe, category/attribute mapping, quality gate
- **Dry-run default** — no blind publish to PIM or live store
- **Feed adapters** — CSV, XML, JSON connectors
- **complete-import-engine-health** / **complete-import-engine-demo** / **complete-import-engine-schema** / **complete-import-engine-docs**
- **API** — `/import-engine/health`, `/import-engine/preview`, `/import-engine/demo`

```bash
python3 main.py complete-import-engine-demo
python3 main.py complete-import-engine-health
```

## AI Phone Assistant MAXIMAL

- **Voice architecture** — telephony + realtime adapters, intent/entity layer, tool gateway
- **Multilingual** — DE/TR/AR/EL/RU detection, human handoff, guardrails
- **Tool contracts** — PIM search, inventory/price, compatibility, lead, handoff
- **complete-phone-health** / **complete-phone-analyze** / **complete-phone-demo** / **complete-phone-schema** / **complete-phone-docs**
- **API** — `/phone/health`, `/phone/analyze`, `/phone/demo`

```bash
python3 main.py complete-phone-demo
python3 main.py complete-phone-analyze --text "Haben Sie das auf Lager?"
```

## Agenten

| Agent | Rolle |
|-------|-------|
| **Doğu Bey** | Intelligence & OSINT |
| **Aslan Bey** | Orchestrator |
| **Esat Bey** | Defensive Security |

## Stack-CLI (intelligence/)

```bash
cd intelligence
python3 main.py complete-init
python3 main.py complete-policy --action public_research
python3 main.py complete-metrics
python3 main.py complete-orchestrate --task-id "T-001" --objective "Research plan"
python3 main.py complete-tree
python3 main.py complete-inventory
python3 main.py complete-verify
python3 main.py complete-maintain --cleanup
python3 main.py complete-test
python3 main.py complete-status
```

## Dauerbetrieb (empfohlen für Produktion)

```bash
# Einmalig: Test-Tasks aufräumen
python3 main.py complete-maintain --cleanup

# API + Scheduler via Docker
docker compose -f buzzard_ai_complete/docker-compose.yml up -d

# Oder Scheduler lokal (alle 5 Min, 1 Task pro Zyklus)
python3 main.py complete-scheduler --interval 300 --process 1
```

## Optional: FastAPI + Docker

```bash
cd intelligence
uvicorn buzzard_ai_complete.api.app:app --reload
# or
docker compose -f buzzard_ai_complete/docker-compose.yml up
```

## Abgrenzung

| Stack | CLI | DB |
|-------|-----|-----|
| **COMPLETE vNext** | `complete-*` | `buzzard_complete.db` |
| **GESAMT v2** | `gesamt-*` | `buzzard.db` |
| **v29/v1** | `verify-*`, `aslan-*` | v29 DB |

Archive: `archive/Buzzard_AI_COMPLETE_VNEXT_ALLES_IN_EINEM_ORDNER.zip`, `archive/Buzzard_AI_NOCH_FEHLENDE_FEHLERBEREINIGT.zip` (o2), `archive/Buzzard_AI_o3_NOCH_FEHLENDE_FEHLERBEREINIGT.zip` (o3 = Duplikat von o2), `archive/Buzzard_AI_COMMERCE_FINAL_REST_ALLES_IN_EINEM_ORDNER.zip` (f3), `archive/fehler_behebung_2.zip`, `archive/Buzzard_AI_LOGISTICS_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`, `archive/Buzzard_AI_ORDER_FULFILLMENT_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`, `archive/Buzzard_AI_CUSTOMER_BILLING_RETURNS_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`, `archive/Buzzard_AI_CUSTOMER_BILLING_RETURNS_ENGINE_V2.zip` (v2 = Duplikat von v1), `archive/Buzzard_AI_CRM_CUSTOMER_EXPERIENCE_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`
