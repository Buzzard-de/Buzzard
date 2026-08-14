# Buzzard Intelligence v1–v200

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite/JSON), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1–v10 | … | Memory → Council |
| v11 | `voice/` | Sprach-UI (Browser Speech API + Flask) |
| v12 | `shared_memory.py` | Langfristige Shared Memory (Entscheidungen, Aufgaben, Konversationen) |
| v13 | `multilingual.py` | Mehrsprachige Begriffe und kanonische Entitäten |
| v14 | `competitor.py` | Legale Wettbewerbs-/Marktbeobachtungen aus öffentlichen Quellen |
| v15 | `trust.py` | Authentizität & Vertrauen (Produkte, Nachweise, Verifizierung) |
| v16 | `profit.py` | Rentabilitätsberechnung und Entscheidungshilfe |
| v17 | `market.py` | Länder- und Marktchancen-Vergleich |
| v18 | `supplier.py` | Lieferantenrecherche und Integrationsbewertung |
| v19 | `risk.py` | Risiko- & Compliance-Signale (Priorität, Review-Workflow) |
| v20 | `orchestrator.py` | Council-Orchestrierung (Aufgaben, Experten, Meinungen) |
| v21 | `gateway.py` | AI Agent Gateway (Provider, Agent-Profile, API-Adapter) |
| v22 | `research.py` | Web Research (Aufgaben, Quellen, Erkenntnisse) |
| v23 | `connectors.py` | Connector Hub (API/Feed-Verbindungen, Capabilities, Health) |
| v24 | `matcher.py` | Product Matching (kanonische Produkte, Listings, Score) |
| v25 | `price.py` | Price Intelligence (Preisbeobachtungen, Signale, Statistik) |
| v26 | `forecast.py` | Demand Forecasting (Nachfrage-Zeitreihen, Prognose, Trend) |
| v27 | `supplier_match.py` | Supplier Matching (Lieferanten-Ranking, Recherche-Priorität) |
| v28 | `selection.py` | Product Selection (PRIORITY/REVIEW/HOLD/REJECT) |
| v29 | `verify.py` | Official Verification (Claims, Quellen, Status) |
| v30 | `mission.py` | Autonomous Mission (12 Agenten, Menschen-Freigabe) |
| v31 | `learning_memory.py` | Learning & Memory (FACT/SIGNAL/LESSON, Recall) |
| v32 | `categories.py` | Category Intelligence (100+ Kategorien, Signale, Queue) |
| v33 | `competitor_monitor.py` | Competitor Monitor (Kategorien, Produkte, Änderungen) |
| v34 | `anomaly.py` | Alerts & Anomaly Detection (JSON) |
| v35 | `taxonomy.py` | Deep Category Taxonomy (JSON) |
| v36 | `geography.py` | Market Geography (JSON) |
| v37 | `compliance_intel.py` | Risk & Compliance Intelligence (JSON) |
| v38 | `scenario.py` | Profitability & Scenario (JSON) |
| v39 | `intel_dashboard.py` | Intelligence Dashboard (JSON) |
| v40 | `master_core.py` | Master Intelligence Core v21–v39 (JSON) |
| v41 | `authorized_research.py` | Authorized Web Research (JSON) |
| v42 | `public_connectors.py` | Public API Data Connectors (JSON) |
| v43 | `normalization.py` | Data Normalization & Deduplication (JSON) |
| v44 | `source_reliability.py` | Source Reliability Scoring (JSON) |
| v45 | `change_detection.py` | Change Detection (JSON) |
| v46–v48 | `rival_*.py` | Wettbewerber-Produkt/Kategorie/Preis (JSON) |
| v49–v51 | `*_radar.py`, `opportunity_discovery.py` | Trend-Radar & Chancen (JSON) |
| v52–v55 | `brand_intel.py`, `supplier_*.py` | Marke & Lieferant (JSON) |
| v56–v60 | `stock/shipping/marketplace/seo/advertising` | Operative Markt-Intelligence (JSON) |
| v61–v64 | `review/promotion/seasonality/crossborder` | Kunden & Märkte (JSON) |
| v65–v68 | `eu_compliance/fx/landed_cost/profit_optimizer` | Compliance & Kosten (JSON) |
| v69 | `portfolio_manager.py` | Portfolio Manager (JSON) |
| v70 | `command_center.py` | Real-Time Command Center (JSON) |
| v71–v80 | `research_jobs.py` … `workflow_auto.py` | Research, Qualität, Agenten, Workflow (JSON) |
| v81–v90 | `price_optimize.py` … `cat_portfolio.py` | Preis, Einkauf, Sortiment, Portfolio (JSON) |
| v91–v99 | `germany_market.py` … `local_marketplace.py` | Länder- & Markt-Intelligence (JSON) |
| v100 | `ai_center.py` | Buzzard AI Intelligence Center (JSON) |
| v101–v110 | `error_handling.py` … `source_freshness.py` | Error Handling, Validierung, Resilience (JSON) |
| v111–v120 | `data_provenance.py` … `error_center.py` | Provenance, Recovery, Production Readiness (JSON) |
| v121–v130 | Security & Datenschutz | Security Architecture … Incident Center (JSON) |
| v131–v140 | Skalierung & Performance | Distributed Processing … Disaster Recovery (JSON) |
| v141–v150 | Advanced AI & Agent Learning | Reasoning … AI Council (JSON) |
| v151–v160 | Supply Chain & Procurement | Procurement … Supply Chain Command Center (JSON) |
| v161–v170 | Customer & Sales Intelligence | Customer … Sales Command Center (JSON) |
| v171–v180 | Marketing Intelligence | Attribution … Marketing Command Center (JSON) |
| v181–v190 | Global Operations | Country Ops … Global Operations Command Center (JSON) |
| v191–v200 | Business Operating Intelligence | Business OS … AI Business Center (JSON) |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py voice
```

Browser: http://127.0.0.1:8787

## Live Data Connector Pack

Echte API-Adapter für autorisierte Live-Datenquellen (`live_connectors/`).

| Connector | Modul | CLI | Auth |
|-----------|-------|-----|------|
| eBay Browse API | `ebay.py` | `live-ebay --query` | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` |
| Amazon Creators API | `amazon_creators.py` | `live-amazon --query` | OAuth + Partner Tag |
| Google Ads API | `google_ads.py` | `live-google-ads` | Developer Token + OAuth |
| Authorized URL Fetcher | `public_fetch.py` | `live-fetch --url` | keine (nur freigegebene URLs) |

```bash
cp .env.example .env   # Credentials eintragen
python main.py live-health
python main.py live-ebay --query "5W-30 Motoröl"
python main.py live-fetch --url "https://example.com"
```

Ohne Credentials: `NOT_CONFIGURED` (keine erfundenen Daten). Siehe `live_connectors/README.md`.

**Abgrenzung:** v23 `connector-*` · v42 `pubconn-*` · `live-*` = echte API-Adapter

Archive: `archive/Buzzard_Intelligence_Live_Data_Connector_Pack.zip`

## Marketplace & Website Monitoring Pack

Katalog von 44 E-Commerce-/Marketplace-/Retail-Sites mit Legal Policies, Scheduler und Observation Schema (`website_monitoring/`).

| CLI | Zweck |
|-----|-------|
| `wsmon-status` | Katalog- und Verbindungsstatus |
| `wsmon-sites` | Alle Sites mit Status |
| `wsmon-catalog` | MANIFEST.json |
| `wsmon-schedule` | Monitor-Scheduler (hourly/daily/weekly) |
| `wsmon-fetch --url` | Autorisierten öffentlichen URL-Abruf |
| `wsmon-legal` | Legal Operation Rules |
| `wsmon-alerts` | Monitoring Alerts |
| `wsmon-test` | pytest auf `tests/` |

```bash
python main.py wsmon-status
python main.py wsmon-sites
python main.py wsmon-schedule
```

Alle Sites starten mit `enabled: false` und `NOT_CONNECTED`. Erst nach Zugangsverifikation aktivieren.

**Abgrenzung:** `live-*` = Live API Adapter · `wsmon-*` = Site-Katalog + Policies · `mplace-*` = v58 JSON Modul

Archive: `archive/Buzzard_Intelligence_Marketplace_Website_Monitoring.zip`

## Final Production Completion Package

Nach v200: Integrations-, Verifikations-, Deployment- und Betriebsarbeiten — **keine weiteren Versionsnummern**.

13 Workstreams unter `production/`:

| # | Workstream | Inhalt |
|---|------------|--------|
| 01 | Architecture Integration | v21–v200 zu einem System verbinden |
| 02 | Live Connectors | Autorisierte Live-Quellen produktiv |
| 03 | Data Pipeline | Abruf → Validierung → Speicherung |
| 04 | Memory & Learning | v31 als gemeinsames Gedächtnis |
| 05 | Agents & Council | Mission-/Task-Schnittstelle, Synthese |
| 06 | Security & Privacy | Secrets, DSGVO, Audit |
| 07 | Testing | Unit bis E2E, Go-Live-Blocker |
| 08 | Observability | Metriken, Alerts, Kosten |
| 09 | Backup & Recovery | RPO/RTO, Restore-Tests |
| 10 | Deployment | dev/test/prod, Rollback |
| 11 | Business Rules | Buzzard-Margen- und Freigabe-Regeln |
| 12 | Documentation | Architektur, Runbooks, Lizenzen |
| 13 | Go-Live | Pilot-Gate-Checkliste |

```bash
python main.py prod-checklist
python main.py prod-gate
python main.py prod-status
python main.py prod-workstreams
```

Checkliste: `production/FINAL_MASTER_CHECKLIST.md`

Archive: `archive/Buzzard_Intelligence_FINAL_PRODUCTION_COMPLETION.zip`

## Master Integration Complete Package

Gemeinsame Systemhülle nach v200: zentrale Konfiguration, Gate-Status (SQLite), Audit-Event-Log und Go-Live-Prüfung.

| CLI | Zweck |
|-----|-------|
| `mint-init` | Master-Integration initialisieren (Gates + Events) |
| `mint-health` | DB, Config und Gate-Health |
| `mint-test` | Automatischer Preflight (setzt Gate-Status) |
| `mint-status` | Gate-Status-Übersicht |
| `mint-go-live` | Go-Live-Check (alle Gates PASS/APPROVED) |
| `mint-dod` | Definition of Done |

```bash
python main.py mint-init
python main.py mint-health
python main.py mint-test
python main.py mint-status
python main.py mint-go-live
```

Config: `master_integration/config/system.json` · Gates-DB: `master_integration/buzzard_master.db` (gitignored)

**Abgrenzung:** v40 `master-*` = JSON Master Core · `mint-*` = System-Integrationshülle · `prod-*` = Dokumentations-Checklisten

Archive: `archive/Buzzard_Intelligence_MASTER_INTEGRATION_COMPLETE.zip`

## Final Integration / Test / Go-Live Pack

Praktischer Arbeitsblock nach v200: Integration → Connectoren → Pipeline → Tests → Security → Monitoring → Backup → Deployment → Go-Live.

| CLI | Zweck |
|-----|-------|
| `fint-preflight` | Pflicht-Checklisten und Manifest prüfen |
| `fint-test` | pytest auf `final_integration/04_tests/` |
| `fint-go-live` | Go-Live-Check (blockiert ohne echte Verifikation) |
| `fint-status` | Status-Zusammenfassung |
| `fint-gate` | Go-Live-Gate-Dokument |
| `fint-dod` | Final Definition of Done |

```bash
python main.py fint-preflight
python main.py fint-test
python main.py fint-go-live
```

Checklisten unter `final_integration/` (Connectors, Pipeline, Security, Monitoring, Backup, Deployment, Runbooks).

**Abgrenzung:** `prod-*` = Production Workstreams · `mint-*` = SQLite-Gates · `fint-*` = Integration/Test/Go-Live · `live-*` = Live-Adapter

Archive: `archive/Buzzard_Intelligence_FINAL_INTEGRATION_TEST_GO_LIVE.zip`

## v34–v40 JSON Intelligence Bundle

Modulare JSON-Foundation (`json_store.py`) für Alerts, Taxonomie, Geografie, Compliance, Szenarien, Dashboard und Master Core.

| Version | Modul | CLI-Präfix | Store |
|---------|-------|------------|-------|
| v34 | `anomaly.py` | `anomaly-*` | `buzzard_v34.json` |
| v35 | `taxonomy.py` | `taxonomy-*` | `buzzard_v35.json` |
| v36 | `geography.py` | `geo-*` | `buzzard_v36.json` |
| v37 | `compliance_intel.py` | `compliance-*` | `buzzard_v37.json` |
| v38 | `scenario.py` | `scenario-*` | `buzzard_v38.json` |
| v39 | `intel_dashboard.py` | `idash-*` | `buzzard_v39.json` |
| v40 | `master_core.py` | `master-*` | `buzzard_v40.json` |

```bash
python main.py init-v34
python main.py anomaly-demo
python main.py anomaly-report
python main.py init-v40
python main.py master-demo
python main.py master-report
python main.py init   # unified init v1–v40
```

**Abgrenzung:** v9 `alerts` · v19 `risk-*` · v16 `profit-*` · v32 `category-*` · v33 `rivals-*` · v37 `compliance-*`

Archive: `archive/Buzzard_Intelligence_v33_to_v40_COMPLETE.zip` (+ einzelne v34–v40 ZIPs)

## v41–v70 JSON Intelligence Bundle

30 weitere JSON-Module auf Basis von `json_store.py` — autorisierte/öffentliche Quellen, auditierbar, Menschen-Freigabe für irreversible Entscheidungen.

| Version | Modul | CLI-Präfix | Zweck |
|---------|-------|------------|-------|
| v41 | `authorized_research.py` | `authres-*` | Authorized Web Research |
| v42 | `public_connectors.py` | `pubconn-*` | Public API Data Connectors |
| v43 | `normalization.py` | `norm-*` | Data Normalization & Deduplication |
| v44 | `source_reliability.py` | `srscore-*` | Source Reliability Scoring |
| v45 | `change_detection.py` | `cdetect-*` | Change Detection |
| v46 | `rival_product.py` | `rprod-*` | Competitor Product Tracking |
| v47 | `rival_category.py` | `rcatmap-*` | Competitor Category Mapping |
| v48 | `rival_price.py` | `rprice-*` | Competitor Price Tracking |
| v49 | `market_radar.py` | `mradar-*` | Market Trend Radar |
| v50 | `opportunity_discovery.py` | `oppdisc-*` | Opportunity Discovery |
| v51 | `product_radar.py` | `pradar-*` | Product Trend Radar |
| v52 | `brand_intel.py` | `brand-*` | Brand Intelligence |
| v53 | `supplier_verify.py` | `sverify-*` | Supplier Verification |
| v54 | `supplier_performance.py` | `sperf-*` | Supplier Performance Tracking |
| v55 | `supplier_price.py` | `sprice-*` | Supplier Price Comparison |
| v56 | `stock_intel.py` | `stock-*` | Stock & Availability Intelligence |
| v57 | `shipping_intel.py` | `ship-*` | Shipping & Delivery Intelligence |
| v58 | `marketplace_intel.py` | `mplace-*` | Marketplace Intelligence |
| v59 | `seo_intel.py` | `seo-*` | SEO & Search Demand Intelligence |
| v60 | `advertising_intel.py` | `advert-*` | Advertising Intelligence |
| v61 | `review_intel.py` | `revintel-*` | Customer Review Intelligence |
| v62 | `promotion_intel.py` | `promo-*` | Promotion & Discount Intelligence |
| v63 | `seasonality_intel.py` | `season-*` | Seasonality Intelligence |
| v64 | `crossborder_intel.py` | `xborder-*` | Cross-Border Market Intelligence |
| v65 | `eu_compliance.py` | `eucomp-*` | EU & Germany Compliance Monitor |
| v66 | `fx_intel.py` | `fx-*` | Currency & FX Intelligence |
| v67 | `landed_cost.py` | `lcost-*` | Landed Cost Calculator |
| v68 | `profit_optimizer.py` | `profopt-*` | Advanced Profitability Optimizer |
| v69 | `portfolio_manager.py` | `port-*` | Portfolio & Category Portfolio Manager |
| v70 | `command_center.py` | `cmdctr-*` | Real-Time Intelligence Command Center |

```bash
python main.py init-v41
python main.py authres-demo
python main.py authres-report
python main.py init-v70
python main.py cmdctr-demo
python main.py cmdctr-report
python main.py init   # unified init v1–v70
```

**Abgrenzung:** v22 `research-*` · v23 `connector-*` · v25 `price-*` · v33 `rivals-*` · v37 `compliance-*` · v65 `eucomp-*`

Archive: `archive/Buzzard_Intelligence_v41_v70_ALL_REMAINING.zip` (+ einzelne v41–v70 ZIPs)

## v71–v100 JSON Intelligence Bundle

30 weitere JSON-Module — Research-Automatisierung, Qualität, Agenten, Einkauf/Preis, Sortiment, Länder-Märkte und AI Center.

| Version | Modul | CLI-Präfix | Zweck |
|---------|-------|------------|-------|
| v71 | `research_jobs.py` | `rjobs-*` | Automated Research Jobs |
| v72 | `data_quality.py` | `dqc-*` | Data Quality Control |
| v73 | `multi_agent.py` | `magent-*` | Multi-Agent Collaboration |
| v74 | `hypothesis.py` | `hypoth-*` | Hypothesis Engine |
| v75 | `fact_check.py` | `fcheck-*` | Fact Checking & Counter Verification |
| v76 | `opportunity_rank.py` | `oprank-*` | Opportunity Ranking |
| v77 | `product_discovery.py` | `pdisc-*` | Product Discovery |
| v78 | `supplier_discovery.py` | `sdisc-*` | Supplier Discovery |
| v79 | `market_entry.py` | `mentry-*` | Market Entry Planner |
| v80 | `workflow_auto.py` | `wflow-*` | Intelligence Workflow Automation |
| v81 | `price_optimize.py` | `dprice-*` | Dynamic Price Optimization |
| v82 | `margin_intel.py` | `dmargin-*` | Dynamic Margin Intelligence |
| v83 | `roas_intel.py` | `roas-*` | Advertising ROAS Intelligence |
| v84 | `inventory_plan.py` | `invplan-*` | Inventory Planning |
| v85 | `demand_purchase.py` | `dpurch-*` | Demand to Purchasing |
| v86 | `purchase_price.py` | `psell-*` | Purchasing to Selling Price |
| v87 | `cross_sell.py` | `xsell-*` | Cross-Sell Intelligence |
| v88 | `bundle_intel.py` | `bundle-*` | Bundle Intelligence |
| v89 | `assortment_opt.py` | `assort-*` | Assortment Optimization |
| v90 | `cat_portfolio.py` | `catport-*` | Category Portfolio Intelligence |
| v91 | `germany_market.py` | `demark-*` | Germany Market Intelligence |
| v92 | `eu_market.py` | `eumark-*` | EU Market Intelligence |
| v93 | `turkey_market.py` | `trmark-*` | Türkiye Market Intelligence |
| v94 | `gulf_market.py` | `gulfmark-*` | Gulf Market Intelligence |
| v95 | `intl_expansion.py` | `intl-*` | International Expansion Intelligence |
| v96 | `global_currency.py` | `gcfx-*` | Global Currency Intelligence |
| v97 | `global_customs.py` | `gcustoms-*` | Global Customs Intelligence |
| v98 | `global_logistics.py` | `glog-*` | Global Logistics Intelligence |
| v99 | `local_marketplace.py` | `lmarket-*` | Local Marketplace Intelligence |
| v100 | `ai_center.py` | `aicenter-*` | Buzzard AI Intelligence Center |

```bash
python main.py init-v71
python main.py rjobs-demo && python main.py rjobs-report
python main.py init-v100
python main.py aicenter-demo && python main.py aicenter-report
python main.py init   # unified init v1–v100
```

Archive: `archive/Buzzard_Intelligence_v71_v100_COMPLETE.zip` (+ einzelne v71–v100 ZIPs)

## v101–v120 Error Resilience Bundle

20 JSON-Module für Production Hardening — Fehlerbehandlung, Validierung, Retry, Recovery und Readiness.

| Version | Modul | CLI-Präfix | Zweck |
|---------|-------|------------|-------|
| v101 | `error_handling.py` | `uerr-*` | Unified Error Handling |
| v102 | `input_validation.py` | `inval-*` | Input Validation |
| v103 | `schema_validation.py` | `svalid-*` | Schema Validation |
| v104 | `api_retry.py` | `retry-*` | API Retry & Backoff |
| v105 | `rate_limit.py` | `ratelimit-*` | Rate Limit Manager |
| v106 | `circuit_breaker.py` | `cbreak-*` | Timeout & Circuit Breaker |
| v107 | `credential_validation.py` | `credval-*` | Credential & Secret Validation |
| v108 | `data_integrity.py` | `dinteg-*` | Data Integrity Checks |
| v109 | `conflict_resolution.py` | `conflict-*` | Duplicate & Conflict Resolution |
| v110 | `source_freshness.py` | `fresh-*` | Source Freshness Monitor |
| v111 | `data_provenance.py` | `proven-*` | Data Provenance & Lineage |
| v112 | `audit_integrity.py` | `audit-*` | Audit Log Integrity |
| v113 | `agent_health.py` | `aghealth-*` | Agent Health Monitor |
| v114 | `mission_recovery.py` | `mrecover-*` | Mission Recovery Manager |
| v115 | `queue_recovery.py` | `qrecover-*` | Queue & Job Recovery |
| v116 | `approval_guardrails.py` | `guard-*` | Human Approval Guardrails |
| v117 | `backup_restore.py` | `backup-*` | Backup & Restore Manager |
| v118 | `system_health.py` | `syshealth-*` | System Health Dashboard |
| v119 | `integration_tests.py` | `e2etest-*` | End-to-End Integration Tests |
| v120 | `error_center.py` | `errctr-*` | Production Readiness & Error Center |

```bash
python main.py init-v101
python main.py uerr-demo && python main.py uerr-report
python main.py init-v120
python main.py errctr-demo && python main.py errctr-report
python main.py init   # unified init v1–v120
```

Checkliste: `error_resilience/MASTER_ERROR_CHECKLIST.md`

Archive: `archive/Buzzard_Intelligence_v101_v120_Error_Resilience_COMPLETE.zip`

## v121–v200 Architecture Completion Bundle

80 JSON-Module — vervollständigt die geplante Architektur nach v120.

| Block | Versionen | Beispiel-CLI |
|-------|-----------|--------------|
| Security & Datenschutz | v121–v130 | `secarch-*`, `gdpr-*`, `secinc-*` |
| Skalierung & Performance | v131–v140 | `distdata-*`, `cache-*`, `disaster-*` |
| Advanced AI & Agent Learning | v141–v150 | `reason-*`, `debate-*`, `aicouncil-*` |
| Supply Chain & Procurement | v151–v160 | `procure-*`, `scchain-*` |
| Customer & Sales Intelligence | v161–v170 | `custintel-*`, `salescc-*` |
| Marketing Intelligence | v171–v180 | `campaign-*`, `mktcc-*` |
| Global Operations | v181–v190 | `countryops-*`, `globops-*` |
| Business Operating Intelligence | v191–v200 | `bizos-*`, `bizai-*` |

```bash
python main.py init-v121
python main.py secarch-demo && python main.py secarch-report
python main.py init-v200
python main.py bizai-demo && python main.py bizai-report
python main.py init   # unified init v1–v200
```

Roadmap: `ROADMAP.md`

Archive: `archive/Buzzard_Intelligence_v121_v200_ALL_REMAINING_COMPLETE.zip` (+ einzelne v121–v200 ZIPs)

## v33 Competitor Intelligence

- Wettbewerber mit URL, Markt und Status tracken
- Öffentliche Kategorie-Struktur und Produktanzahl
- Produkt-Beobachtungen mit Preis und Sichtbarkeits-Signalen
- Änderungsberichte über Kategorien und Events
- Nur legale, öffentliche Quellen — kein CAPTCHA-/Login-Bypass

```bash
python main.py init-v33
python main.py rivals-demo
python main.py rivals-report
python main.py rivals-changes --competitor "Example Marketplace"
python main.py rivals-add --name "Example Marketplace" --url "https://example.com" --market "Germany"
python main.py rivals-category --competitor "Example Marketplace" --category "Automotive" --count 120
python main.py rivals-product --competitor "Example Marketplace" --category "Automotive" --name "Example 5W-30" --price 49.90 --signal featured
```

v14 `competitor-*` = Basis · v33 `rivals-*` = erweitertes Monitoring.

Archive: `archive/Buzzard_Intelligence_v33_Competitor_Intelligence.zip`

## v32 Category Intelligence

- 100+ Kategorien als zentraler Forschungs-Katalog
- Marktsignale: Nachfrage, Wettbewerb, Lieferant, Marge, Risiko → Chancen-Score
- Vorhanden/fehlend-Status für Buzzard-Kategorien
- Recherche-Warteschlange nach Priorität
- Kein automatischer Produktkauf

```bash
python main.py init-v32
python main.py category-seed
python main.py category-demo
python main.py category-report
python main.py category-queue
python main.py category-signal --category "Automotive" --demand 90 --competition 70 --supplier 85 --margin 80 --risk 20
python main.py category-owned --category "Automotive"
```

v8 `discover` = Kategorie-Entdeckung · v32 `category-*` = Katalog & Priorität.

Archive: `archive/Buzzard_Intelligence_v32_Category_Intelligence.zip`

## v31 Learning & Memory

- Persistente Intelligence-Ergebnisse: FACT, SIGNAL, DECISION, LESSON, PREFERENCE
- Quelle, Konfidenz, Status und Audit-Trail
- Recall-Suche; Widersprüche als CONFLICT
- Keine erfundenen Fakten; kritische Regeln ohne Menschen-Freigabe unverändert

```bash
python main.py init-v31
python main.py learn-demo
python main.py learn-report
python main.py learn-recall --query "Motoröl"
python main.py learn-remember --kind FACT --topic "Automotive" --text "Beispiel-Fund" --confidence 0.85 --source "https://example.com"
python main.py learn-lesson --topic "Lieferant" --text "Unverifizierte Lieferanten nicht priorisieren."
python main.py learn-status --memory-id 1 --status OUTDATED
```

v2 `memory` = Produktbeobachtungen · v12 `remember`/`recall` = Shared Memory · v31 `learn-*` = Learning Memory.

Archive: `archive/Buzzard_Intelligence_v31_Learning_Memory.zip`

## v30 Autonomous Mission

- Oberziel → 12 Experten-Aufgaben (Market … Council Manager)
- Priorität, Abhängigkeiten, Ergebnisse, Belege, Audit-Log
- Status: PLANNED → RUNNING → WAITING_HUMAN → APPROVED/REJECTED
- Kein autonomer Einkauf, Zahlung oder rechtliche Freigabe

```bash
python main.py init-v30
python main.py mission-demo
python main.py mission-board
python main.py mission-create --title "Neue Automotive-Produktchancen in Deutschland recherchieren"
python main.py mission-result --task-id 1 --agent "Market Intelligence" --result "Nachfrage-Signal positiv" --confidence 0.85
python main.py mission-approve --mission-id 1 --decision APPROVED --note "Prüfung abgeschlossen."
```

v20 `orch-board` = Orchestrator-Pinnwand · v30 `mission-board` = Mission-Pinnwand.

Archive: `archive/Buzzard_Intelligence_v30_Autonomous_Mission.zip`

## v29 Official Verification

- Claims mit offiziellen Quellen verknüpfen (Regierung, Hersteller, Plattform, Standard)
- Quellentypen mit Qualitäts-Score; Primär vs. Sekundär
- Status: UNVERIFIED, PENDING, VERIFIED, CONFLICT, OUTDATED, REJECTED
- VERIFIED nur bei ausreichender Quellenstärke (≥ 90)
- Kein Rechtsberatungsersatz; widersprüchliche Quellen → CONFLICT

```bash
python main.py init-v29
python main.py verify-demo
python main.py verify-report
python main.py verify-claim --entity "5W-30 Motoröl" --text "Hersteller listet Produkt."
python main.py verify-source --claim-id 1 --type OFFICIAL_MANUFACTURER --url "https://example.com" --publisher "Example"
python main.py verify-set --claim-id 1 --status VERIFIED --note "Primäre Herstellerquelle."
```

Archive: `archive/Buzzard_Intelligence_v29_Official_Verification.zip`

## v28 Product Selection

- Intelligence-Signale zu einem Handels-Prioritätssignal kombinieren
- Signale: Rentabilität, Nachfrage, Preis/Markt, Lieferant, Risiko, Vertrauen
- Entscheidungen: PRIORITY, REVIEW, HOLD, REJECT
- Nettogewinn < €0,50 → REJECT (Buzzard-Schwelle)
- Keine automatische Einkaufs- oder Rechtskonformitätsentscheidung

```bash
python main.py init-v28
python main.py selection-demo
python main.py selection-report
python main.py selection-add --name "5W-30 Motoröl" --category "Automotive" --profit 2.40 --demand 85 --price 80 --market 82 --supplier 90 --risk 15 --trust 92
```

Archive: `archive/Buzzard_Intelligence_v28_Product_Selection.zip`

## v27 Supplier Matching

- Lieferanten für Produkt/Kategorie vergleichen und Recherche-Priorität setzen
- Signale: Vertrauen, Integration, Logistik, Risiko, Dropshipping, White-Label, Nachweise
- Status: TOP_PRIORITY, GOOD_CANDIDATE, LOW_PRIORITY, REVIEW
- Score ist keine Lieferanten-Freigabe; Risiko/Authentizität separat prüfen

```bash
python main.py init-v27
python main.py supplier-match-demo
python main.py supplier-match-report
python main.py supplier-match-add --name "Example Supplier" --category "Automotive" --trust 85 --integration 90 --logistics 80 --risk 15
python main.py supplier-match-run --product "5W-30 Motoröl" --category "Automotive"
```

Archive: `archive/Buzzard_Intelligence_v27_Supplier_Matching.zip`

## v26 Demand Forecasting

- Tägliche/wöchentliche Nachfrage-Beobachtungen speichern
- Trend, gleitender Durchschnitt und Richtung (RISING/FALLING/STABLE)
- Einfache Forward-Prognose mit datenbasierter Konfidenz
- Bei weniger als 3 Beobachtungen: explizit „Daten unzureichend“
- Keine Verkaufsgarantie; Saison/Kampagnen/Out-of-Stock separat modellieren

```bash
python main.py init-v26
python main.py demand-demo
python main.py demand-report
python main.py demand-observation --product-id "EAN-123" --value 120 --period "2026-08-01"
python main.py demand-forecast --product-id "EAN-123" --window 7
```

Archive: `archive/Buzzard_Intelligence_v26_Demand_Forecasting.zip`

## v25 Price Intelligence

- Preisbeobachtungen mit Verkäufer, Quelle und Zeitstempel
- Preisänderungs-Signale (PRICE_UP / PRICE_DOWN) ab ≥1 % Änderung
- Min/Max/Durchschnitt je Produkt
- Versand, MwSt., Gutscheine und Varianten bei Vergleichen berücksichtigen
- Keine Verkaufs- oder Gewinngarantie

```bash
python main.py init-v25
python main.py price-demo
python main.py price-report
python main.py price-add --product-id "EAN-123" --seller "Example Store" --price 49.90 --currency EUR --source "https://example.com/product"
python main.py price-changes --product-id "EAN-123"
```

Archive: `archive/Buzzard_Intelligence_v25_Price_Intelligence.zip`

## v24 Product Matching

- Kanonische Produkte und Quell-Listings über EAN, GTIN, MPN, OEM, Marke, Name
- Score 0–100 mit erklärbaren Matching-Signalen
- Status: HIGH_CONFIDENCE, REVIEW, LOW_CONFIDENCE
- Widersprüchliche Identifikationsnummern = starkes Negativsignal
- Kein Beweis für Originalität oder rechtliche Konformität

```bash
python main.py init-v24
python main.py match-demo
python main.py match-report
python main.py match-canonical --name "5W-30 Motoröl" --brand "Example" --category "Automotive"
python main.py match-listing --source "Example Store" --name "Example 5W30" --ean "1234567890123" --mpn "ABC-5W30"
python main.py match-analyze --listing-id 1 --candidate-id 2
```

Archive: `archive/Buzzard_Intelligence_v24_Product_Matching.zip`

## v23 Connector Hub

- Zentraler Connector-Layer für autorisierte API-/Feed-Verbindungen
- API-Schlüssel nur über Environment-Variable — nicht im Code oder in der DB
- Capabilities: Produkte, Preise, Bestand, Bestellungen, Tracking (inbound/outbound)
- Health-Status und Sync-Run-Protokoll
- Je Provider eigener Adapter; kein einheitliches API-Format angenommen

```bash
python main.py init-v23
python main.py connector-demo
python main.py connector-report
python main.py connector-add --name "Example Supplier API" --kind supplier --base-url "https://api.example.com" --key-env "BUZZARD_EXAMPLE_KEY"
python main.py connector-capability --connector "Example Supplier API" --name products --direction inbound
python main.py connector-health --connector "Example Supplier API" --status healthy
```

Archive: `archive/Buzzard_Intelligence_v23_Connector_Hub.zip`

## v22 Web Research

- Forschungsaufgaben mit Query und Zweck
- Öffentliche Web-Quellen (URL, Titel, Domain)
- Erkenntnisse mit Konfidenz, verknüpft mit Quelle
- Kein CAPTCHA-/Login-Bypass; Einzelquelle ≠ verifiziert

```bash
python main.py init-v22
python main.py research-demo
python main.py research-report
python main.py research-create --query "Germany automotive aftermarket trends" --purpose "Market Intelligence"
python main.py research-source --research-id 1 --url "https://example.com" --title "Example source"
python main.py research-finding --research-id 1 --source-id 1 --claim "Example claim" --confidence 0.85
```

Archive: `archive/Buzzard_Intelligence_v22_Web_Research.zip`

## v21 AI Agent Gateway

- Provider-unabhängiges Gateway für echte AI-Modelle
- API-Schlüssel nur über Umgebungsvariablen — nicht im Code
- Agent-Profile für Market, Supplier, Risk, Council Manager, …
- AI-Ausgabe als Meinung/Signal — v20 Council bewertet; keine automatische Handelsentscheidung

```bash
python main.py init-v21
python main.py ai-demo
python main.py ai-providers
python main.py ai-add-provider --name openai --base-url "https://api.openai.com/v1/chat/completions" --model gpt-4o --api-key-env OPENAI_API_KEY
```

Echte Provider-Integration erfordert einen Adapter gemäß offizieller API-Dokumentation.

Archive: `archive/Buzzard_Intelligence_v21_AI_Agent_Gateway.zip`

## v20 Council Orchestrator

- Experten-Agenten: Market, Competitor, Supplier, Profitability, Risk, …
- Aufgabenverteilung, Status-Tracking, Meinungssammlung
- Widersprüchliche Meinungen bleiben erhalten
- Keine automatische Endentscheidung — finale Entscheidung beim Menschen

```bash
python main.py init-v20
python main.py orch-demo
python main.py orch-board
python main.py orch-create --title "5W-30 Motoröl Recherche" --priority 9
python main.py orch-assign --task-id 1 --agent "Supplier Intelligence"
python main.py orch-opinion --task-id 1 --agent "Risk & Compliance" --decision REVIEW --confidence 0.90 --note "Dokumentenprüfung erforderlich"
```

v10 `council-board` = Review-Posteingang · v20 `orch-board` = Orchestrator-Pinnwand.

Archive: `archive/Buzzard_Intelligence_v20_Council_Orchestrator.zip`

## v19 Risk & Compliance

- Risikotypen: AUTHENTICITY, SUPPLIER, PRODUCT_SAFETY, CUSTOMS, TAX, IP_TRADEMARK, …
- Schweregrad: LOW, MEDIUM, HIGH, CRITICAL
- Prioritätsscore 0–100; fehlende Quelle erhöht Priorität
- Keine Rechtsberatung; Risikosignale ≠ rechtlicher Verstoß

```bash
python main.py init-v19
python main.py risk-demo
python main.py risk-report
python main.py risk-add --entity "Beispiel Produkt" --type PRODUCT_SAFETY --severity HIGH --source official-source --country DE
python main.py risk-verify --risk-id 1 --status UNDER_REVIEW --note "Prüfung gestartet"
```

Archive: `archive/Buzzard_Intelligence_v19_Risk_Compliance.zip`

## v18 Supplier Intelligence

- Lieferantenprofile: Land, B2B-Status, Quelle
- Integrationsfähigkeiten: API, XML, Dropshipping, TecDoc, White-label, …
- Vertrauens- und Integrationsscore (recherchebasiert)
- Keine automatische „vertrauenswürdig“-Markierung

```bash
python main.py init-v18
python main.py supplier-demo
python main.py supplier-report
python main.py supplier-add --name "Example Supplier" --country DE --b2b yes --source "https://example.com"
python main.py supplier-capability --supplier "Example Supplier" --capability API --status verified --evidence "https://example.com/api-docs"
```

Archive: `archive/Buzzard_Intelligence_v18_Supplier_Intelligence.zip`

## v17 Market Opportunity

- Märkte: Nachfrage, Wettbewerb, Logistik, Risiko je Land
- Produktchancen mit Score über Länder hinweg (DE, TR, VAE, SA, …)
- Fehlende Daten = Lücke, nicht automatisch 0
- Score ist Vergleichswerkzeug — keine Verkaufsgarantie

```bash
python main.py init-v17
python main.py market-demo
python main.py market-report
python main.py market-add --country DE --market Deutschland --demand 80 --competition 60 --logistics 85 --risk 20
python main.py opportunity-add --country DE --category Automotive --product "5W-30 Motoröl" --demand 85 --competition 55 --margin 75 --logistics 80 --risk 20
```

Archive: `archive/Buzzard_Intelligence_v17_Market_Opportunity.zip`

## v16 Profitability

- Einkauf, Versand, Marktplatz-, Zahlungs-, Werbe-, Verpackungskosten
- Steuer/MwSt. als direkter EUR-Aufwand
- Buzzard-Schwellwert: Nettogewinn < €0,50 → `GEWINN_ZU_GERING`
- Status: GEEIGNET, GEWINN_ZU_GERING, VERLUST

```bash
python main.py init-v16
python main.py profit-demo
python main.py profit-report
python main.py profit-calc --name "Beispiel Produkt" --sale 29.90 --cost 12 --shipping 4 --marketplace 2.99 --payment 0.90 --ads 2 --packaging 0.50 --other 0.30 --tax 0
```

Kein Ersatz für steuerliche oder rechtliche Beratung.

Archive: `archive/Buzzard_Intelligence_v16_Profitability.zip`

## v15 Authenticity & Trust

- Produktquelle, Marke, Lieferant und Verifizierungsstatus
- Nachweisdokumente (Rechnung, Herstellerdaten, …)
- Status: UNVERIFIED → PENDING → VERIFIED / REJECTED / DISPUTED
- Keine automatische „Original“-Markierung; Risikosignale ≠ Fälschungsvorwurf

```bash
python main.py init-v15
python main.py trust-demo
python main.py trust-report
python main.py trust-product --name "Beispiel Produkt" --brand "Example" --supplier "Example Supplier"
python main.py trust-evidence --product-id 1 --type INVOICE --issuer "Example Supplier" --reference "DOC-001"
python main.py trust-verify --product-id 1 --status VERIFIED --note "Quelle geprüft"
```

Archive: `archive/Buzzard_Intelligence_v15_Authenticity_Trust.zip`

## v14 Competitor Intelligence

- Öffentliche Wettbewerber/Shops mit Land und Quelle
- Sichtbare Kategorien, Produkte, veröffentlichte Preise
- Popularität nur als Signal, wenn die Quelle es öffentlich veröffentlicht
- Keine privaten Daten, kein Umgehen von Zugriffsbeschränkungen

```bash
python main.py init-v14
python main.py competitor-demo
python main.py competitor-report
python main.py competitor-add --name "Example Store" --country DE --source "https://example.com"
python main.py competitor-product --competitor "Example Store" --category Automotive --name "Beispiel Produkt" --price 49.90 --source "https://example.com/product"
```

Archive: `archive/Buzzard_Intelligence_v14_Competitor_Intelligence.zip`

## v13 Multilingual Intelligence

- TR, DE, EN, AR, FR, ES, IT, NL, PL
- Kanonische Entitäten mit mehrsprachigen Begriffen
- Quellen, Konfidenz, Übersetzungsstatus (UNVERIFIED)

```bash
python main.py init-v13
python main.py ml-demo
python main.py ml-report
python main.py term-add --language de --text "Motoröl 5W-30" --canonical "5W-30 Motor Yağı" --entity product
```

Archive: `archive/Buzzard_Intelligence_v13_Multilingual.zip`

## v12 Shared Memory

- Entscheidungen, Aufgaben, Präferenzen, Konversationen, Entitäten
- Tags, Verknüpfungen, Audit-Trail
- Status: ACTIVE, VERIFIED, DISPUTED, ARCHIVED, REJECTED

```bash
python main.py init-v12
python main.py remember --type DECISION --text "Buzzard fokussiert zuerst auf Deutschland." --source user
python main.py recall --query "Deutschland"
python main.py shared-timeline
```

v2 `memory <query>` = Produkt-/Marktbeobachtungen · v12 `recall` = Shared Memory.

Archive: `archive/Buzzard_Intelligence_v12_Shared_Memory.zip`

## v11 Voice Interface

- Deutsch / Türkisch (Browser Speech Recognition)
- Sprachausgabe via Speech Synthesis
- Befehle: **Bericht**, **Warnungen**, **Posteingang**, **Hilfe**
- Anbindung an v9 Reporting und v10 Council

```bash
python main.py voice --host 127.0.0.1 --port 8787
```

Kein eigenes KI-Modell — nutzt den lokalen Intelligence-Stack.

Archive: `archive/Buzzard_Intelligence_v11_Voice_Interface.zip`

Siehe: `docs/BUZZARD_INTELLIGENCE.md`
