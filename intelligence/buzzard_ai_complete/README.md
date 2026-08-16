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

### V2 Memory & CRM

- **Customer memory** — approved facts, call history, identity verification gate
- **Privacy** — hashed phone storage, no private context without verification
- **complete-phone-memory-health** / **complete-phone-memory-demo** / **complete-phone-memory-context** / **complete-phone-memory-docs**
- **API** — `/phone/memory/health`, `/phone/memory/customer`, `/phone/memory/context/{id}`, `/phone/memory/demo`

```bash
python3 main.py complete-phone-memory-demo
```

### V3 Telephony FINAL

- **Signed webhooks** — inbound call gateway, media stream contract, human handoff
- **Safe defaults** — `enabled: false`, recording off until production config
- **complete-phone-telephony-health** / **complete-phone-telephony-demo** / **complete-phone-telephony-schema** / **complete-phone-telephony-docs**
- **API** — `/phone/telephony/health`, `/phone/telephony/inbound`, `/phone/telephony/demo`

```bash
python3 main.py complete-phone-telephony-demo
```

## Complete Commerce Platform MAXIMAL FINAL

- **Unified orchestration** — taxonomy → PIM → multilingual → supplier → commerce → checkout → orders → logistics → marketplaces → phone AI
- **Dry-run default** — no live payment side effects until providers configured
- **complete-platform-health** / **complete-platform-modules** / **complete-platform-demo** / **complete-platform-schema** / **complete-platform-docs**
- **API** — `/platform/health`, `/platform/modules`, `/platform/demo`

```bash
python3 main.py complete-platform-demo
python3 main.py complete-platform-health
```

## Production Integration MAXIMAL ONE PACKAGE

- **Production contracts** — payment, carriers, suppliers, marketplaces, telephony, webhooks
- **Business engines** — pricing, forecasting, finance, RMA, knowledge graph, customer/supplier intelligence
- **Deployment** — Docker, K8s, preflight, runbook (`live_activation: false`)
- **complete-production-integration-health** / **complete-production-integration-readiness** / **complete-production-integration-demo** / **complete-production-integration-schema** / **complete-production-integration-docs**
- **API** — `/production/health`, `/production/readiness`, `/production/demo`

```bash
python3 main.py complete-production-integration-demo
python3 main.py complete-production-integration-readiness
```

## Launch Sequence MAXIMAL ONE PACKAGE

- **9 Launch-Stufen** — Domain/Server → PIM → Supplier → Payment → Shipping → Marketplace → Telephony → Security/E2E → Launch
- **PIM-Import-Pipeline** — CSV/JSON-Import mit Schema-Validierung
- **Aktivierungs-Gates** — Payment, Shipping, Marketplace, Telephony (Konfiguration, kein Live-Go)
- **E2E-Dry-Run** — Katalog, Suche, Checkout-Simulation
- **complete-launch-sequence-health** / **complete-launch-sequence-stages** / **complete-launch-sequence-demo** / **complete-launch-sequence-schema** / **complete-launch-sequence-docs**
- **API** — `/launch/health`, `/launch/stages`, `/launch/sequence`, `/launch/schema/pim-import`, `/launch/demo`
- **`live_activation: false`** — externe Accounts und echte Provisionierung weiterhin manuell

```bash
python3 main.py complete-launch-sequence-demo
python3 main.py complete-launch-sequence-stages
```

## AI Council 18 UNIFIED MAXIMAL

- **18 Spezialisten** — Chief Strategy, Market, Demand, Competition, Profit, Supply, Forecast, TikTok, YouTube, Marketplace, Compliance, Logistics, Customer, Returns, Manufacturer, Season, Quality, Country
- **Shared Memory & Event Bus** — Findings fließen zwischen Agenten
- **Evidence & Guardrails** — keine erfundenen Fakten; Human-Approval-Gates
- **Doğu Bey / Esat Bey** — bestehende Spezialisten per Contract anbindbar
- **complete-ai-council-18-health** / **complete-ai-council-18-agents** / **complete-ai-council-18-demo** / **complete-ai-council-18-schema** / **complete-ai-council-18-docs**
- **API** — `/council-18/health`, `/council-18/agents`, `/council-18/case`, `/council-18/schema`, `/council-18/demo`
- **`live_activation: false`**

```bash
python3 main.py complete-ai-council-18-demo
python3 main.py complete-ai-council-18-agents
```

## AI Council 19 CUSTOMS BUREAUCRACY MAXIMAL

- **19. Council-Mitglied** — Customs & Bureaucracy AI (erweitert Council 18)
- **Zoll-Gates** — HS/CN/TARIC, Ursprung, Restriktionen, Lizenzen
- **Dokument-Checkliste** — Invoice, Packing List, Origin Evidence, Customs Declaration
- **Landed Cost** — nur mit verifizierten Zoll-/Steuersätzen
- **Risiko-Engine** — Sonderprodukte, fehlende Klassifikation/Ursprung/Evidence
- **complete-ai-council-19-health** / **complete-ai-council-19-agents** / **complete-ai-council-19-assess** / **complete-ai-council-19-demo** / **complete-ai-council-19-schema** / **complete-ai-council-19-docs**
- **API** — `/council-19/health`, `/council-19/agents`, `/council-19/assess`, `/council-19/schema`, `/council-19/demo`
- **`live_activation: false`** — keine bindenden Zoll-/Rechtsauskünfte

```bash
python3 main.py complete-ai-council-19-assess
python3 main.py complete-ai-council-19-demo
```

## 43 Category Intelligence MAXIMAL

- **43 Spezialisten** — je ein Category Intelligence Agent pro Hauptkategorie
- **Preis-Intelligence** — Seller-Vergleich, Statistiken, Änderungserkennung
- **Taxonomy-Gaps** — fehlende Kategorien/Subkategorien erkennen
- **Public-Web-Policy** — nur legale öffentliche Quellen, robots/access controls
- **Shared Memory & Event Bus** — Council-Bridge zu 19-Agent-Council
- **complete-category-intelligence-43-health** / **complete-category-intelligence-43-agents** / **complete-category-intelligence-43-demo** / **complete-category-intelligence-43-schema** / **complete-category-intelligence-43-docs**
- **API** — `/category-intelligence-43/health`, `/category-intelligence-43/agents`, `/category-intelligence-43/analyze`, `/category-intelligence-43/schema`, `/category-intelligence-43/demo`
- **`live_activation: false`** — Taxonomy-/Preisänderungen nur nach Human Approval

```bash
python3 main.py complete-category-intelligence-43-demo
python3 main.py complete-category-intelligence-43-agents
```

## Social Intelligence AI MAXIMAL

- **Zentrales Social-Brain** — Facebook, Instagram, TikTok, YouTube, Pinterest, Reddit, X, LinkedIn, Foren
- **Cross-Platform-Signale** — Trend, Product Discovery, Category Gaps, Competitor Activity
- **Customer Voice** — Sentiment aus öffentlichen Quellen
- **Privacy-Policy** — nur public/authorized, kein Auth/CAPTCHA-Bypass
- **Council-Bridge** — Demand, Competition, Profit, Forecast, Chief Strategy
- **complete-social-intelligence-health** / **complete-social-intelligence-platforms** / **complete-social-intelligence-demo** / **complete-social-intelligence-schema** / **complete-social-intelligence-docs**
- **API** — `/social-intelligence/health`, `/social-intelligence/platforms`, `/social-intelligence/schema`, `/social-intelligence/demo`
- **`live_activation: false`** — kein Auto-Posting, kein Auto-Ad-Spend

```bash
python3 main.py complete-social-intelligence-demo
python3 main.py complete-social-intelligence-platforms
```

## Automotive Taxonomy MAXIMAL

- **Vehicle-Need-First** — System → Komponente → Produkt → exakte Fitment
- **90+ Master-Systeme** — Motor, Bremsen, Flüssigkeiten, EV, Nutzfahrzeuge, etc.
- **6 Ebenen** — Hauptkategorie bis Fahrzeug-Fitment
- **Fitment-Dimensionen** — Marke, Modell, Generation, Jahr, Motor, Motorcode, etc.
- **Connector-Contracts** — TecDoc, OEM, Supplier API/XML
- **complete-automotive-taxonomy-health** / **complete-automotive-taxonomy-seed** / **complete-automotive-taxonomy-demo** / **complete-automotive-taxonomy-schema** / **complete-automotive-taxonomy-docs**
- **Tires MAXIMAL** — separate `Lastikler` category with 12 vehicle types, size validation, fitment
- **complete-automotive-taxonomy-tires-categories** / **complete-automotive-taxonomy-tires-demo** / **complete-automotive-taxonomy-tires-schema** / **complete-automotive-taxonomy-tires-docs**
- **API** — `/automotive-taxonomy/health`, `/automotive-taxonomy/seed`, `/automotive-taxonomy/schema`, `/automotive-taxonomy/demo`, `/automotive-taxonomy/tires/categories`, `/automotive-taxonomy/tires/demo`, `/automotive-taxonomy/tires/config`
- **`live_activation: false`** — Fitment nur mit Evidenz, kein Auto-Publish

```bash
python3 main.py complete-automotive-taxonomy-seed
python3 main.py complete-automotive-taxonomy-demo
python3 main.py complete-automotive-taxonomy-tires-categories
python3 main.py complete-automotive-taxonomy-tires-demo
```

## Agriculture MAXIMAL

- **Machine-Need-First** — Maschinentyp → System → Teil → exakte Maschinen-Fitment
- **9 Branches** — Maschinen, Ersatzteile, Verbrauchsmaterial, Ausrüstung, Bewässerung, Gewächshaus, Obst-/Weinbau, Werkzeuge
- **Tiefe Taxonomie** — Hauptkategorie → Unterkategorie → Unter-Unterkategorie → Produktgruppe → Produkt → Fitment
- **Market Signals** — Nachfrage, Wettbewerb, Preis, Marge, Lieferantenrisiko
- **Gap Detection** — Vergleich mit öffentlichen Wettbewerber-Taxonomien
- **complete-agriculture-health** / **complete-agriculture-branches** / **complete-agriculture-demo** / **complete-agriculture-schema** / **complete-agriculture-docs**
- **API** — `/agriculture/health`, `/agriculture/branches`, `/agriculture/schema`, `/agriculture/demo`
- **`live_activation: false`** — Fitment nur mit Evidenz, Konflikte → Human Review

```bash
python3 main.py complete-agriculture-branches
python3 main.py complete-agriculture-demo
```

## Renewable Energy MAXIMAL

- **System-Need-First** — Solar, Wind, Storage, Hybrid, Home/Building, Agriculture Energy
- **9 Branches** — Güneş, Rüzgâr, Depolama, Hibrit, Ev/Bina, Tarım, Koruma, Bakım, Ticari/Endüstriyel
- **Compatibility Engine** — Konservatives Matching mit Evidenz (fehlende Daten = unknown)
- **Market Intelligence** — Nachfrage, Marge, Wettbewerb, Lieferstabilität, Saisonalität, Risiko
- **complete-renewable-energy-health** / **complete-renewable-energy-branches** / **complete-renewable-energy-demo** / **complete-renewable-energy-schema** / **complete-renewable-energy-docs** / **complete-renewable-energy-taxonomy**
- **API** — `/renewable-energy/health`, `/renewable-energy/branches`, `/renewable-energy/schema`, `/renewable-energy/taxonomy`, `/renewable-energy/demo`
- **`live_activation: false`** — Kompatibilität nur mit Evidenz, Konflikte → Human Review

```bash
python3 main.py complete-renewable-energy-branches
python3 main.py complete-renewable-energy-taxonomy
python3 main.py complete-renewable-energy-demo
```

## Livestock MAXIMAL (Hayvancılık)

- **Animal-Need-First** — Tiergruppe → Bedarf/System → Unterkategorie → Produkt → Equipment-Fitment
- **Tiergruppen** — Büyükbaş, Koyun/Keçi, Kanatlı, Domuz, At, Arıcılık, Akuakultur
- **Systemgruppen** — Barınak, Yemleme, Sulama, Sağım, Gübre, Transport, Automation
- **Equipment Fitment** — Quellengestützte Kompatibilität (keine medizinische Diagnose)
- **complete-livestock-health** / **complete-livestock-branches** / **complete-livestock-demo** / **complete-livestock-schema** / **complete-livestock-docs**
- **API** — `/livestock/health`, `/livestock/branches`, `/livestock/schema`, `/livestock/demo`
- **`live_activation: false`** — Fitment nur mit Evidenz, Konflikte → Human Review

```bash
python3 main.py complete-livestock-branches
python3 main.py complete-livestock-demo
```

## Master Taxonomy CLEAN

- **Unified Bundle** — Automotive/Tires + Agriculture + Livestock in one clean verification layer
- **Sales OFF** — `BUZZARD_SALES_ENABLED=0`, `live_activation: false`
- **Fitment Rules** — source-backed fitment, human review on conflicts
- **complete-master-taxonomy-clean-health** / **complete-master-taxonomy-clean-demo** / **complete-master-taxonomy-clean-manifest** / **complete-master-taxonomy-clean-docs**
- **API** — `/master-taxonomy-clean/health`, `/master-taxonomy-clean/manifest`, `/master-taxonomy-clean/sales-defaults`, `/master-taxonomy-clean/demo`

```bash
python3 main.py complete-master-taxonomy-clean-health
python3 main.py complete-master-taxonomy-clean-demo
```

## Construction MAXIMAL (İnşaat & İnşaat Makineleri)

- **Construction-Need-First** — Baumaschinen-Typ → System → Teil → exakte Maschinen-Fitment
- **22 Branches** — Materialien, Erdbewegung, Beton, Straße, Krane, Bohren, Verdichtung, Werkzeuge, Sicherheit, Ersatzteile, Anbaugeräte, Hydraulik, Elektrik, Wartung, Vermessung, Recycling
- **complete-construction-health** / **complete-construction-branches** / **complete-construction-demo** / **complete-construction-schema** / **complete-construction-taxonomy** / **complete-construction-docs**
- **API** — `/construction/health`, `/construction/branches`, `/construction/schema`, `/construction/taxonomy`, `/construction/demo`
- **`live_activation: false`** — Fitment nur mit Evidenz, Konflikte → Human Review

```bash
python3 main.py complete-construction-branches
python3 main.py complete-construction-taxonomy
python3 main.py complete-construction-demo
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
python app.py
# Buzzard project gizli:
cd gizli && python app.py                    # API :8000 + Voice :8787
cd gizli && python voice.py                  # only http://127.0.0.1:8787
cd gizli && python 8787.py                   # alias → voice.py
# npm: npm run gizli | gizli:voice | gizli:start
# or uvicorn directly:
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
