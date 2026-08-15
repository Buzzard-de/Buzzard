# Buzzard Intelligence v1–v200

Python-MVP für quellenbasierte Markt- und Produktbeobachtungen — getrennt vom Node-Shop und der Render-API.

## Überblick

| Version | Modul | Speicher |
|---------|-------|----------|
| v1–v10 | … | siehe vorherige Abschnitte |
| v11 | `voice/` | kein eigener DB-Speicher (UI-Schicht) |
| v12 | `shared_memory.py` | `buzzard_shared_memory_v12.db` |
| v13 | `multilingual.py` | `buzzard_multilingual_v13.db` |
| v14 | `competitor.py` | `buzzard_competitor_v14.db` |
| v15 | `trust.py` | `buzzard_trust_v15.db` |
| v16 | `profit.py` | `buzzard_profit_v16.db` |
| v17 | `market.py` | `buzzard_market_v17.db` |
| v18 | `supplier.py` | `buzzard_supplier_v18.db` |
| v19 | `risk.py` | `buzzard_risk_v19.db` |
| v20 | `orchestrator.py` | `buzzard_council_v20.db` |
| v21 | `gateway.py` | `buzzard_ai_gateway_v21.db` |
| v22 | `research.py` | `buzzard_web_research_v22.db` |
| v23 | `connectors.py` | `buzzard_connector_hub_v23.db` |
| v24 | `matcher.py` | `buzzard_product_matching_v24.db` |
| v25 | `price.py` | `buzzard_price_v25.db` |
| v26 | `forecast.py` | `buzzard_demand_v26.db` |
| v27 | `supplier_match.py` | `buzzard_supplier_match_v27.db` |
| v28 | `selection.py` | `buzzard_product_selection_v28.db` |
| v29 | `verify.py` | `buzzard_official_verification_v29.db` |
| v30 | `mission.py` | `buzzard_mission_v30.db` |
| v31 | `learning_memory.py` | `buzzard_learning_memory_v31.db` |
| v32 | `categories.py` | `buzzard_category_intelligence_v32.db` |
| v33 | `competitor_monitor.py` | `buzzard_competitor_v33.db` |
| v34 | `anomaly.py` | `buzzard_v34.json` |
| v35 | `taxonomy.py` | `buzzard_v35.json` |
| v36 | `geography.py` | `buzzard_v36.json` |
| v37 | `compliance_intel.py` | `buzzard_v37.json` |
| v38 | `scenario.py` | `buzzard_v38.json` |
| v39 | `intel_dashboard.py` | `buzzard_v39.json` |
| v40 | `master_core.py` | `buzzard_v40.json` |
| v41 | `authorized_research.py` | `buzzard_v41.json` |
| v42 | `public_connectors.py` | `buzzard_v42.json` |
| v43 | `normalization.py` | `buzzard_v43.json` |
| v44 | `source_reliability.py` | `buzzard_v44.json` |
| v45 | `change_detection.py` | `buzzard_v45.json` |
| v46 | `rival_product.py` | `buzzard_v46.json` |
| v47 | `rival_category.py` | `buzzard_v47.json` |
| v48 | `rival_price.py` | `buzzard_v48.json` |
| v49 | `market_radar.py` | `buzzard_v49.json` |
| v50 | `opportunity_discovery.py` | `buzzard_v50.json` |
| v51 | `product_radar.py` | `buzzard_v51.json` |
| v52 | `brand_intel.py` | `buzzard_v52.json` |
| v53 | `supplier_verify.py` | `buzzard_v53.json` |
| v54 | `supplier_performance.py` | `buzzard_v54.json` |
| v55 | `supplier_price.py` | `buzzard_v55.json` |
| v56 | `stock_intel.py` | `buzzard_v56.json` |
| v57 | `shipping_intel.py` | `buzzard_v57.json` |
| v58 | `marketplace_intel.py` | `buzzard_v58.json` |
| v59 | `seo_intel.py` | `buzzard_v59.json` |
| v60 | `advertising_intel.py` | `buzzard_v60.json` |
| v61 | `review_intel.py` | `buzzard_v61.json` |
| v62 | `promotion_intel.py` | `buzzard_v62.json` |
| v63 | `seasonality_intel.py` | `buzzard_v63.json` |
| v64 | `crossborder_intel.py` | `buzzard_v64.json` |
| v65 | `eu_compliance.py` | `buzzard_v65.json` |
| v66 | `fx_intel.py` | `buzzard_v66.json` |
| v67 | `landed_cost.py` | `buzzard_v67.json` |
| v68 | `profit_optimizer.py` | `buzzard_v68.json` |
| v69 | `portfolio_manager.py` | `buzzard_v69.json` |
| v70 | `command_center.py` | `buzzard_v70.json` |
| v71 | `research_jobs.py` | `buzzard_v71.json` |
| v72 | `data_quality.py` | `buzzard_v72.json` |
| v73 | `multi_agent.py` | `buzzard_v73.json` |
| v74 | `hypothesis.py` | `buzzard_v74.json` |
| v75 | `fact_check.py` | `buzzard_v75.json` |
| v76 | `opportunity_rank.py` | `buzzard_v76.json` |
| v77 | `product_discovery.py` | `buzzard_v77.json` |
| v78 | `supplier_discovery.py` | `buzzard_v78.json` |
| v79 | `market_entry.py` | `buzzard_v79.json` |
| v80 | `workflow_auto.py` | `buzzard_v80.json` |
| v81 | `price_optimize.py` | `buzzard_v81.json` |
| v82 | `margin_intel.py` | `buzzard_v82.json` |
| v83 | `roas_intel.py` | `buzzard_v83.json` |
| v84 | `inventory_plan.py` | `buzzard_v84.json` |
| v85 | `demand_purchase.py` | `buzzard_v85.json` |
| v86 | `purchase_price.py` | `buzzard_v86.json` |
| v87 | `cross_sell.py` | `buzzard_v87.json` |
| v88 | `bundle_intel.py` | `buzzard_v88.json` |
| v89 | `assortment_opt.py` | `buzzard_v89.json` |
| v90 | `cat_portfolio.py` | `buzzard_v90.json` |
| v91 | `germany_market.py` | `buzzard_v91.json` |
| v92 | `eu_market.py` | `buzzard_v92.json` |
| v93 | `turkey_market.py` | `buzzard_v93.json` |
| v94 | `gulf_market.py` | `buzzard_v94.json` |
| v95 | `intl_expansion.py` | `buzzard_v95.json` |
| v96 | `global_currency.py` | `buzzard_v96.json` |
| v97 | `global_customs.py` | `buzzard_v97.json` |
| v98 | `global_logistics.py` | `buzzard_v98.json` |
| v99 | `local_marketplace.py` | `buzzard_v99.json` |
| v100 | `ai_center.py` | `buzzard_v100.json` |
| v101 | `error_handling.py` | `buzzard_v101.json` |
| v102 | `input_validation.py` | `buzzard_v102.json` |
| v103 | `schema_validation.py` | `buzzard_v103.json` |
| v104 | `api_retry.py` | `buzzard_v104.json` |
| v105 | `rate_limit.py` | `buzzard_v105.json` |
| v106 | `circuit_breaker.py` | `buzzard_v106.json` |
| v107 | `credential_validation.py` | `buzzard_v107.json` |
| v108 | `data_integrity.py` | `buzzard_v108.json` |
| v109 | `conflict_resolution.py` | `buzzard_v109.json` |
| v110 | `source_freshness.py` | `buzzard_v110.json` |
| v111 | `data_provenance.py` | `buzzard_v111.json` |
| v112 | `audit_integrity.py` | `buzzard_v112.json` |
| v113 | `agent_health.py` | `buzzard_v113.json` |
| v114 | `mission_recovery.py` | `buzzard_v114.json` |
| v115 | `queue_recovery.py` | `buzzard_v115.json` |
| v116 | `approval_guardrails.py` | `buzzard_v116.json` |
| v117 | `backup_restore.py` | `buzzard_v117.json` |
| v118 | `system_health.py` | `buzzard_v118.json` |
| v119 | `integration_tests.py` | `buzzard_v119.json` |
| v120 | `error_center.py` | `buzzard_v120.json` |
| v121–v130 | Security & Datenschutz | `buzzard_v121.json` … `buzzard_v130.json` |
| v131–v140 | Skalierung & Performance | `buzzard_v131.json` … `buzzard_v140.json` |
| v141–v150 | Advanced AI & Agent Learning | `buzzard_v141.json` … `buzzard_v150.json` |
| v151–v160 | Supply Chain & Procurement | `buzzard_v151.json` … `buzzard_v160.json` |
| v161–v170 | Customer & Sales Intelligence | `buzzard_v161.json` … `buzzard_v170.json` |
| v171–v180 | Marketing Intelligence | `buzzard_v171.json` … `buzzard_v180.json` |
| v181–v190 | Global Operations | `buzzard_v181.json` … `buzzard_v190.json` |
| v191–v200 | Business Operating Intelligence | `buzzard_v191.json` … `buzzard_v200.json` |

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## v34–v40 Bundle — neu

Modulare JSON-Foundation für Alerts, Taxonomie, Geografie, Compliance, Szenarien, Dashboard und Master Core.

| Version | Modul | CLI-Präfix | Zweck |
|---------|-------|------------|-------|
| v34 | `anomaly.py` | `anomaly-*` | Alerts & Anomaly Detection |
| v35 | `taxonomy.py` | `taxonomy-*` | Deep Category Taxonomy |
| v36 | `geography.py` | `geo-*` | Market Geography |
| v37 | `compliance_intel.py` | `compliance-*` | Risk & Compliance Intelligence (v37) |
| v38 | `scenario.py` | `scenario-*` | Profitability & Scenario |
| v39 | `intel_dashboard.py` | `idash-*` | Intelligence Dashboard |
| v40 | `master_core.py` | `master-*` | Master Intelligence Core (v21–v39) |

### CLI (Beispiel)

```bash
cd intelligence
python main.py init-v34
python main.py anomaly-demo
python main.py anomaly-report
python main.py init-v40
python main.py master-demo
python main.py master-report
```

**Abgrenzung:** v9 `alerts` · v19 `risk-*` · v16 `profit-*` · v32 `category-*` · v33 `rivals-*`

## v41–v70 Bundle — neu

30 JSON-Module für autorisierte Web-Recherche, Connectors, Wettbewerb, Lieferanten, operative Markt-Intelligence, Compliance, Kosten und Command Center.

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

### CLI (Beispiel)

```bash
cd intelligence
python main.py init-v41
python main.py authres-demo
python main.py authres-report
python main.py init-v70
python main.py cmdctr-demo
python main.py cmdctr-report
python main.py init
```

**Abgrenzung:** v22 `research-*` · v23 `connector-*` · v25 `price-*` · v37 `compliance-*` · v65 `eucomp-*`

## Live Data Connector Pack — neu

Echte API-Adapter unter `intelligence/live_connectors/` für autorisierte Live-Daten.

| Connector | CLI | Credentials (`.env`) |
|-----------|-----|----------------------|
| eBay Browse API | `live-ebay --query` | `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET` |
| Amazon Creators API | `live-amazon --query` | `AMAZON_*` + Partner Tag |
| Google Ads API | `live-google-ads` | `GOOGLE_ADS_*` |
| Authorized URL Fetcher | `live-fetch --url` | optional `BUZZARD_USER_AGENT` |

### CLI

```bash
cd intelligence
cp .env.example .env
python main.py live-health
python main.py live-ebay --query "5W-30 Motoröl"
python main.py live-fetch --url "https://example.com"
```

**Regeln:** Secrets nur in `.env` · kein CAPTCHA-/Login-Bypass · `NOT_CONFIGURED` statt Fake-Daten

**Abgrenzung:** v23 `connector-*` = Hub-Metadaten · v42 `pubconn-*` = JSON-Stub · `live-*` = Live-Adapter

## Marketplace & Website Monitoring Pack — neu

46-Site-Katalog mit Legal Policies, Scheduler und Observation Schema unter `intelligence/website_monitoring/`.

| CLI | Zweck |
|-----|-------|
| `wsmon-status` | Katalog- und Verbindungsstatus |
| `wsmon-sites` | Alle Sites mit Status |
| `wsmon-catalog` | MANIFEST.json |
| `wsmon-schedule` | Monitor-Scheduler |
| `wsmon-fetch --url` | Autorisierten öffentlichen URL-Abruf |
| `wsmon-legal` | Legal Operation Rules |
| `wsmon-alerts` | Monitoring Alerts |
| `wsmon-test` | pytest |

```bash
cd intelligence
python main.py wsmon-status
python main.py wsmon-sites
```

Sites starten mit `enabled: false` — erst nach Zugangsverifikation aktivieren.

**Abgrenzung:** `live-*` · `wsmon-*` · `mplace-*` (v58)

Archive: `intelligence/archive/Buzzard_Intelligence_Marketplace_Website_Monitoring.zip` (+ `_UPDATED.zip`)

## Final Production Completion Package — neu

Nach v200: Integrations-, Verifikations-, Deployment- und Betriebsarbeiten (13 Workstreams unter `intelligence/production/`).

| CLI | Zweck |
|-----|-------|
| `prod-checklist` | Final Master Checklist (A–I) |
| `prod-gate` | Go-Live Gate |
| `prod-status` | Status-Zusammenfassung (Module, Stores, Live Connectors) |
| `prod-workstreams` | Alle 13 Workstream-READMEs |

```bash
cd intelligence
python main.py prod-checklist
python main.py prod-gate
python main.py prod-status
python main.py prod-workstreams
```

Definition of Done: integriert, getestet, autorisierte Live-Quellen, sicher, beobachtbar, recoverable, Human-Approval aktiv — **nicht** nur Modul-Dateien vorhanden.

Archive: `intelligence/archive/Buzzard_Intelligence_FINAL_PRODUCTION_COMPLETION.zip`

## Master Integration Complete Package — neu

Gemeinsame Systemhülle: zentrale Konfiguration, SQLite-Gates, Audit-Event-Log, Preflight und Go-Live-Prüfung unter `intelligence/master_integration/`.

| CLI | Zweck |
|-----|-------|
| `mint-init` | Master-Integration initialisieren |
| `mint-health` | DB, Config und Gate-Health |
| `mint-test` | Automatischer Preflight |
| `mint-status` | Gate-Status-Übersicht |
| `mint-go-live` | Go-Live-Check (PASS/APPROVED erforderlich) |
| `mint-dod` | Definition of Done |

```bash
cd intelligence
python main.py mint-init
python main.py mint-health
python main.py mint-test
python main.py mint-go-live
```

**Abgrenzung:** v40 `master-*` = JSON Master Core · `mint-*` = System-Integrationshülle · `prod-*` = Dokumentations-Checklisten

Archive: `intelligence/archive/Buzzard_Intelligence_MASTER_INTEGRATION_COMPLETE.zip`

## Final Integration / Test / Go-Live Pack — neu

Checklisten, Tests und Go-Live-Gate unter `intelligence/final_integration/` — keine erfundenen Live-Ergebnisse.

| CLI | Zweck |
|-----|-------|
| `fint-preflight` | Pflicht-Checklisten und Manifest prüfen |
| `fint-test` | pytest auf `04_tests/` |
| `fint-go-live` | Go-Live-Check (blockiert ohne echte Verifikation) |
| `fint-status` | Status-Zusammenfassung |
| `fint-gate` | Go-Live-Gate-Dokument |
| `fint-dod` | Final Definition of Done |

```bash
cd intelligence
python main.py fint-preflight
python main.py fint-test
python main.py fint-go-live
```

**Abgrenzung:** `prod-*` · `mint-*` · `fint-*` · `live-*`

Archive: `intelligence/archive/Buzzard_Intelligence_FINAL_INTEGRATION_TEST_GO_LIVE.zip`

## v71–v100 Bundle — neu

30 JSON-Module für Research-Automatisierung, Qualität, Multi-Agent, Einkauf/Preis, Sortiment, Länder-Märkte und AI Center.

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

### CLI (Beispiel)

```bash
cd intelligence
python main.py init-v71
python main.py rjobs-demo
python main.py rjobs-report
python main.py init-v100
python main.py aicenter-demo
python main.py aicenter-report
python main.py init
```

## v101–v120 Error Resilience Bundle — neu

20 JSON-Module für Production Hardening: Fehlerbehandlung, Validierung, Retry/Backoff, Recovery und Readiness.

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

### CLI (Beispiel)

```bash
cd intelligence
python main.py init-v101
python main.py uerr-demo
python main.py uerr-report
python main.py init-v120
python main.py errctr-demo
python main.py errctr-report
python main.py init
```

Checkliste: `intelligence/error_resilience/MASTER_ERROR_CHECKLIST.md`

## v121–v200 Architecture Completion Bundle — neu

80 JSON-Module vervollständigen die geplante Architektur nach v120.

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

### CLI (Beispiel)

```bash
cd intelligence
python main.py init-v121
python main.py secarch-demo
python main.py secarch-report
python main.py init-v200
python main.py bizai-demo
python main.py bizai-report
python main.py init
```

Roadmap: `intelligence/ROADMAP.md`

## v33 Competitor Intelligence — neu

Strukturiertes Wettbewerber-Tracking aus öffentlichen Quellen — **kein CAPTCHA-/Login-Bypass**.

| Feature | Beschreibung |
|---------|--------------|
| Wettbewerber | Name, URL, Markt, Status |
| Kategorien | Öffentliche Kategorie-Struktur, Produktanzahl |
| Produkte | Preis, Sichtbarkeits-Signale (featured/popular) |
| Änderungen | Kategorie- und Event-Verlauf |
| Regel | Beobachtung ≠ Schätzung; nur legale Quellen |

### CLI

```bash
cd intelligence
python main.py init-v33
python main.py rivals-demo
python main.py rivals-report
python main.py rivals-changes --competitor "Example Marketplace"
python main.py rivals-add --name "Example Marketplace" --url "https://example.com" --market "Germany"
python main.py rivals-category --competitor "Example Marketplace" --category "Automotive" --count 120
python main.py rivals-product --competitor "Example Marketplace" --category "Automotive" --name "Example 5W-30" --price 49.90 --currency EUR --signal featured
```

v14 `competitor-*` = Basis-Wettbewerbsbeobachtung · v33 `rivals-*` = erweitertes Monitoring.

## v32 Category Intelligence — neu

Zentraler Kategorie-Katalog (100+) mit Marktsignalen und Recherche-Warteschlange — **kein automatischer Produktkauf**.

| Feature | Beschreibung |
|---------|--------------|
| Katalog | 100+ Kategorien, owned/fehlend-Status |
| Signale | Nachfrage, Wettbewerb, Lieferant, Marge, Risiko → Chancen-Score |
| Queue | Priorisierte Recherche-Warteschlange |
| Regel | Kategoriechance ≠ sichere Annahme ohne Marktsignale |

### CLI

```bash
cd intelligence
python main.py init-v32
python main.py category-seed
python main.py category-demo
python main.py category-report
python main.py category-queue
python main.py category-signal --category "Automotive" --demand 90 --competition 70 --supplier 85 --margin 80 --risk 20
python main.py category-owned --category "Automotive"
```

v8 `discover` = Kategorie-Entdeckung · v32 `category-*` = Kategorie-Katalog & Priorität.

## v31 Learning & Memory — neu

Persistentes Lernen aus Intelligence-Ergebnissen — **keine erfundenen Fakten**.

| Feature | Beschreibung |
|---------|--------------|
| Typen | FACT, SIGNAL, DECISION, LESSON, PREFERENCE |
| Status | ACTIVE, NEEDS_REVIEW, OUTDATED, CONFLICT, ARCHIVED |
| Recall | Textsuche mit Konfidenz und Quelle |
| Regel | Alte Einträge werden nicht still gelöscht; Widersprüche → CONFLICT |

### CLI

```bash
cd intelligence
python main.py init-v31
python main.py learn-demo
python main.py learn-report
python main.py learn-recall --query "Motoröl"
python main.py learn-remember --kind FACT --topic "Automotive" --text "Beispiel-Fund" --confidence 0.85 --source "https://example.com"
python main.py learn-lesson --topic "Lieferant" --text "Unverifizierte Lieferanten nicht priorisieren."
python main.py learn-status --memory-id 1 --status OUTDATED
```

v2 `memory` = Produktbeobachtungen · v12 `remember`/`recall` = Shared Memory · v31 `learn-*` = Learning Memory.

## v30 Autonomous Mission — neu

Mission-Orchestrator für v20–v29 — **Recherche autonom, Handelsentscheidungen mit Menschen-Freigabe**.

| Feature | Beschreibung |
|---------|--------------|
| Mission | Ziel → 12 Experten-Aufgaben mit Priorität und Abhängigkeiten |
| Agenten | Market, Category, Competitor, Supplier, Matching, Price, Demand, Profit, Trust, Risk, Verification, Council |
| Status | PLANNED → RUNNING → WAITING_HUMAN → APPROVED/REJECTED |
| Regel | Kein autonomer Einkauf/Zahlung/rechtliche Freigabe |

### CLI

```bash
cd intelligence
python main.py init-v30
python main.py mission-demo
python main.py mission-board
python main.py mission-create --title "Neue Automotive-Produktchancen in Deutschland recherchieren"
python main.py mission-result --task-id 1 --agent "Market Intelligence" --result "Nachfrage-Signal positiv" --confidence 0.85
python main.py mission-approve --mission-id 1 --decision APPROVED --note "Prüfung abgeschlossen."
```

## v29 Official Verification — neu

Verknüpfung von Claims mit offiziellen Quellen — **kein Rechtsberatungsersatz**.

| Feature | Beschreibung |
|---------|--------------|
| Claims | Entität, Behauptung, Kategorie, Status, Verifizierungs-Score |
| Quellen | OFFICIAL_GOVERNMENT, OFFICIAL_MANUFACTURER, OFFICIAL_PLATFORM, … |
| Status | UNVERIFIED, PENDING, VERIFIED, CONFLICT, OUTDATED, REJECTED |
| Regel | VERIFIED nur bei Quellenqualität ≥ 90; Widersprüche → CONFLICT |

### CLI

```bash
cd intelligence
python main.py init-v29
python main.py verify-demo
python main.py verify-report
python main.py verify-claim --entity "5W-30 Motoröl" --text "Hersteller listet Produkt."
python main.py verify-source --claim-id 1 --type OFFICIAL_MANUFACTURER --url "https://example.com" --publisher "Example"
python main.py verify-set --claim-id 1 --status VERIFIED --note "Primäre Herstellerquelle."
```

## Doğu Bey + Aslan Bey v1 — neu

Müsteşar-Koordination über v29 Official Verification (`aslan.py` + `dogubey_aslan/README.md`).

| CLI | Zweck |
|-----|-------|
| `aslan-task` | Aufgabe für Doğu Bey erstellen |
| `aslan-status` | Aufgabenstatus aktualisieren |
| `aslan-result` | Ergebnis speichern |
| `aslan-review` | Claim-Verifikation prüfen |
| `aslan-dashboard` | Müsteşar-Kontrollpanel |

```bash
python main.py init-v29
python main.py aslan-task --title "..." --objective "..." --priority HIGH
python main.py aslan-dashboard
```

Archive: `intelligence/archive/Buzzard_DoguBey_AslanBey_v1.zip`, `Buzzard_AI_ALLES.zip`, `Buzzard_AI_GESAMT.zip`, `Buzzard_AI_ALLES_AUF_EINMAL.zip`, `Buzzard_AI_DoguBey_tek_klasor.zip`, `Buzzard_AI_komplett.zip`

Standalone: `dogubey/README.md`, `buzzard_ai_alles/README.md`, `buzzard_ai_gesamt/README.md`

## Buzzard AI GESAMT Platform v2 — neu (NAECHSTER_GESAMTPAKET)

Upgrade der unified Agent-Platform: versioniertes Memory, Research-Observations/Change Detection,
Esat Bey Content-Scanning, optionaler LLM-Provider, API-Auth, Health-Monitoring.

| CLI | Zweck |
|-----|-------|
| `gesamt-init` | DB + Agent-Registry initialisieren |
| `gesamt-agents` | Registrierte Agenten anzeigen |
| `gesamt-task` | Forschungsaufgabe erstellen |
| `gesamt-dispatch` | Aufgabe an Doğu Bey dispatchen |
| `gesamt-dashboard` | Aslan Bey Kontrollpanel |
| `gesamt-report` | Executive Report |
| `gesamt-health` | Platform Health-Check |
| `gesamt-ai-status` | Optionaler LLM-Provider-Status |
| `gesamt-test` | Pytest-Suite (4 Tests) |
| `gesamt-tree` | Vollständiger Architektur-Baum |
| `gesamt-inventory` | Projekt-Inventar |
| `gesamt-status` | Status & Roadmap |

```bash
cd intelligence
python3 main.py gesamt-init
python3 main.py gesamt-tree
python3 main.py gesamt-inventory
python3 main.py gesamt-test
```

Env: siehe `buzzard_ai_gesamt/.env.example` (`BUZZARD_API_TOKEN`, `BUZZARD_LLM_*`)

Optional FastAPI v2: `uvicorn buzzard_ai_gesamt.api.app:app --reload`

Archive: `intelligence/archive/Buzzard_AI_GESAMT_ALLE_FEHLENDEN_ORDNER.zip`, `intelligence/archive/Buzzard_AI_NAECHSTER_GESAMTPAKET.zip`

## Buzzard AI COMPLETE vNext — neu (VNEXT_ALLES_IN_EINEM_ORDNER)

Upgrade mit Policy Gate, Rate Limiting, Metrics, Integration-Adaptern und Docker-Scaffold.

| CLI | Zweck |
|-----|-------|
| `complete-policy` | BuzzardPolicy Entscheidung für Aktion |
| `complete-metrics` | In-Memory Metrics Snapshot |
| `complete-orchestrate` | Orchestrator-Kette |
| `complete-test` | Pytest (9 Tests) |

```bash
cd intelligence
python3 main.py complete-policy --action public_research
python3 main.py complete-metrics
python3 main.py complete-test
```

Archive: `intelligence/archive/Buzzard_AI_COMPLETE_VNEXT_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard AI COMPLETE o2 — neu (NOCH_FEHLENDE_FEHLERBEREINIGT)

Fehlerbereinigtes Gesamtpaket mit vollständigem Architektur-Scaffold und Verify-CLI.

| CLI | Zweck |
|-----|-------|
| `complete-tree` | Architekturbaum (97 Extension Points) |
| `complete-inventory` | Projekt-Inventar |
| `complete-verify` | pytest + Import-Sweep (fehlerfrei) |

```bash
cd intelligence
python3 main.py complete-tree
python3 main.py complete-inventory
python3 main.py complete-verify
python3 main.py complete-test
```

Archive: `intelligence/archive/Buzzard_AI_NOCH_FEHLENDE_FEHLERBEREINIGT.zip`

## Buzzard AI COMPLETE o3 — Duplikat (identisch mit o2)

`o3.zip` ist byte-identisch mit `o2.zip` (`Buzzard_AI_NOCH_FEHLENDE_FEHLERBEREINIGT`). Keine zusätzliche Integration nötig — alle Inhalte sind bereits in `buzzard_ai_complete/` via PR #131 enthalten.

Archive: `intelligence/archive/Buzzard_AI_o3_NOCH_FEHLENDE_FEHLERBEREINIGT.zip`

## Buzzard AI COMPLETE Scheduler — neu

Event-gesteuerte Wartung statt idle Agenten-Loops.

| CLI | Zweck |
|-----|-------|
| `complete-maintain --cleanup` | Smoke/Demo-Tasks stornieren + Security-Audit |
| `complete-maintain --process 3` | Bis zu 3 echte Tasks orchestrieren |
| `complete-scheduler` | Dauerloop (API-Begleiter, Docker `buzzard-scheduler`) |

```bash
cd intelligence
python3 main.py complete-maintain --cleanup
python3 main.py complete-scheduler --interval 300 --process 1
```

## Buzzard AI COMPLETE Commerce f1 — neu

Commerce-Layer für Katalog, Preise, Rentabilität und Produktentscheidungen.

| CLI | Zweck |
|-----|-------|
| `complete-commerce-demo` | Demo-Produkt + Wettbewerberpreis + Entscheidung |
| `complete-commerce-evaluate` | SELL/TEST/REJECT für SKU + Verkaufspreis |
| `complete-commerce-add-product` | Produkt im Katalog anlegen/aktualisieren |

API: `POST /commerce/products`, `POST /commerce/evaluate`

Archive: `intelligence/archive/Buzzard_AI_f1_Commerce.zip`

## Buzzard AI COMPLETE Commerce f2 — neu (COMMERCE_GESAMT)

Vollständiger Commerce-Scaffold mit Extension Points für Marktplätze, Zahlungen, Automotive/TecDoc, Returns, Tax und mehr.

| CLI | Zweck |
|-----|-------|
| `complete-commerce-scope` | Commerce-Gesamtumfang |
| `complete-commerce-tree` | Extension-Tree aller Module |
| `complete-commerce-inventory` | Modul-Inventar (JSON) |

```bash
cd intelligence
python3 main.py complete-commerce-scope
python3 main.py complete-commerce-inventory
```

Archive: `intelligence/archive/Buzzard_AI_COMMERCE_GESAMT.zip`

## Buzzard AI COMPLETE Commerce f3 — neu (FINAL REST)

Integration-Scaffolds für Shipping (DHL, DPD, UPS, GLS, Hermes), Marktplätze, Lieferanten, TecDoc, Payments, Tax, Invoicing, Sandbox sowie Operations und Test-Ordner. Neues Commerce-Modul `risk/`.

| CLI | Zweck |
|-----|-------|
| `complete-commerce-production-work` | Verbleibende Produktionsarbeit |
| `complete-commerce-integration-order` | Empfohlene Integrationsreihenfolge |

```bash
cd intelligence
python3 main.py complete-commerce-production-work
python3 main.py complete-commerce-integration-order
```

Archive: `intelligence/archive/Buzzard_AI_COMMERCE_FINAL_REST_ALLES_IN_EINEM_ORDNER.zip`

## fehler_behebung_2 — Repair (Pytest-Shadowing)

Behebt verschachtelte `tests/commerce/__init__.py`-Marker, die das echte Commerce-Paket überschatten können.

| Fix | Beschreibung |
|-----|--------------|
| Package-Marker entfernt | `tests/commerce/__init__.py`, `integrations/`, `end_to_end/` |
| `complete-verify` | Import-Sweep überspringt `tests/` und `test_*` |
| `verify_project.py` | Main-Guard + sicherer Import-Sweep |

Dokumentation: `buzzard_ai_complete/docs/REPAIR_AND_FULL_TEST_REPORT.md`

Archive: `intelligence/archive/fehler_behebung_2.zip`

## Buzzard AI LOGISTICS ENGINE v1 — neu

Smart Shipping Engine mit Carrier-Adaptern (DHL, DPD, GLS, Hermes, UPS), Parcel-Validierung und Prioritätsauswahl.

| CLI | Zweck |
|-----|-------|
| `complete-logistics-demo` | Demo für cheapest/balanced/fastest |
| `complete-logistics-recommend` | Carrier-Empfehlung für Paket + Ziel |
| `complete-logistics-docs` | Engine-Dokumentation |

API: `POST /logistics/recommend`

```bash
cd intelligence
python3 main.py complete-logistics-demo
python3 main.py complete-logistics-recommend --weight 2 --length 30 --width 20 --height 15 --country DE --postal-code 35075 --priority cheapest
```

Hinweis: `commerce.logistics` = DB-Tarife; `buzzard_ai_complete.logistics` = Smart Shipping Engine.

Archive: `intelligence/archive/Buzzard_AI_LOGISTICS_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard AI ORDER FULFILLMENT ENGINE v1 — neu

Operativer Bestell-Lifecycle: Validierung, Zahlung, Lagerreservierung, Lieferantenauswahl, Fulfillment, Returns.

| CLI | Zweck |
|-----|-------|
| `complete-order-demo` | Demo-Szenarien (Fulfillment + Backorder) |
| `complete-order-process` | Einzelne Bestellung durch die Engine |
| `complete-order-docs` | Engine-Dokumentation |

API: `POST /orders/process`

```bash
cd intelligence
python3 main.py complete-order-demo
python3 main.py complete-order-process --order-id O1 --customer-id C1 --sku SKU-DEMO --quantity 2 --price 10
```

Hinweis: `commerce.orders` = DB-Persistenz; `order_engine` = operativer Fulfillment-Lifecycle.

Archive: `intelligence/archive/Buzzard_AI_ORDER_FULFILLMENT_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard AI CUSTOMER BILLING & RETURNS ENGINE v1 — neu (v1.zip)

Kunden-, Rechnungs-, Zahlungs- und Rückgabe-Grundlage für den operativen Commerce-Stack.

| CLI | Zweck |
|-----|-------|
| `complete-billing-demo` | Demo: Rechnung, Zahlung, Refund, Gutschrift |
| `complete-billing-refund` | Refund-Anfrage stellen |
| `complete-billing-docs` | Engine-Dokumentation |

API: `GET /billing/demo`, `POST /billing/refund`, `POST /billing/payment-status`

```bash
cd intelligence
python3 main.py complete-billing-demo
python3 main.py complete-billing-refund --order-id O1 --reason defective --amount 10
```

Archive: `intelligence/archive/Buzzard_AI_CUSTOMER_BILLING_RETURNS_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard AI CUSTOMER BILLING v2 — Duplikat (identisch mit v1)

`v2.zip` ist byte-identisch mit `v1.zip` (`Buzzard_AI_CUSTOMER_BILLING_RETURNS_ENGINE_V1`). Keine zusätzliche Integration nötig — alle Inhalte sind bereits in `buzzard_ai_complete/` via PR #142 enthalten.

Archive: `intelligence/archive/Buzzard_AI_CUSTOMER_BILLING_RETURNS_ENGINE_V2.zip`

## Buzzard AI CRM & CUSTOMER EXPERIENCE ENGINE v1 — neu

CRM-Grundlage: Kundensegmentierung, Support-Tickets, Events, Loyalty, Reviews, Abandoned Cart.

| CLI | Zweck |
|-----|-------|
| `complete-crm-demo` | Demo: Segmentierung, Ticket, Snapshot, CLV |
| `complete-crm-segment` | Kundensegment aus LTV/Orders/Tickets |
| `complete-crm-docs` | Engine-Dokumentation |

API: `GET /crm/demo`, `POST /crm/segment`

```bash
cd intelligence
python3 main.py complete-crm-demo
python3 main.py complete-crm-segment --ltv 1200 --orders 6
```

Archive: `intelligence/archive/Buzzard_AI_CRM_CUSTOMER_EXPERIENCE_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard AI MARKETING & ADVERTISING ENGINE v1 — neu

Marketing-Grundlage: Budget-Allokation, Kampagnenmodelle, Google/Meta-Provider-Adapter, ROAS-Optimierung, Attribution, Compliance.

| CLI | Zweck |
|-----|-------|
| `complete-marketing-demo` | Demo: Budget, Campaign, Performance, Compliance |
| `complete-marketing-budget` | Budget auf Kanäle verteilen |
| `complete-marketing-docs` | Engine-Dokumentation |

API: `GET /marketing/demo`, `POST /marketing/budget`, `POST /marketing/campaign`

```bash
cd intelligence
python3 main.py complete-marketing-demo
python3 main.py complete-marketing-budget --total 1000 --channels google_ads,meta_ads --weights google_ads:2,meta_ads:1
```

Archive: `intelligence/archive/Buzzard_AI_MARKETING_ADVERTISING_ENGINE_V1_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard AI MAXIMAL — neu (9.zip / MAXIMAL_ALLES_IN_EINEM_ORDNER)

Plattform-Schicht über alle V1-Engines: Registry, Policy, Audit, Health, Security, Idempotency, V2-Erweiterungen.

| CLI | Zweck |
|-----|-------|
| `complete-max-demo` | Demo: Registry, Product Intelligence, Decisions |
| `complete-max-snapshot` | Modul-Snapshot aller MAXIMAL-Engines |
| `complete-max-docs` | Upgrade-Dokumentation |

API: `GET /vmax/demo`, `GET /vmax/snapshot`

V2 add-ons (additiv): Logistics (`routing_v2`, `contracts_v2`, `webhooks_v2`), Orders (`idempotency`, `orchestration_v2`), Billing (`ledger_v2`, `document_numbering_v2`, `tax_policy_v2`), CRM (`consent_v2`, `journeys_v2`, `service_levels_v2`), Marketing (`experiments_v2`, `pacing_v2`, `rules_v2`)

```bash
cd intelligence
python3 main.py complete-max-demo
python3 main.py complete-max-snapshot
```

Archive: `intelligence/archive/Buzzard_AI_MAXIMAL_ALLES_IN_EINEM_ORDNER.zip` (identisch mit `9.zip`)

## Buzzard MAXIMAL One-Piece Control Center — neu

Zentrale Orchestrierungsschicht über alle Engines: Event Bus, Workflows, Access Control, Integration Status, E2E-Plan.

| CLI | Zweck |
|-----|-------|
| `complete-one-piece-demo` | Demo: Workflow, Events, Integrations, E2E |
| `complete-one-piece-e2e` | End-to-End Lifecycle-Plan für Order-ID |
| `complete-one-piece-docs` | Architektur-Dokumentation |

API: `GET /control-center/demo`, `GET /control-center/e2e/{order_id}`

```bash
cd intelligence
python3 main.py complete-one-piece-demo
python3 main.py complete-one-piece-e2e --order-id O1
```

Archive: `intelligence/archive/BUZZARD_MAXIMAL_ONE_PIECE_ALLES_IN_EINEM_ORDNER.zip`

## Buzzard MAXIMAL Analytics & BI — neu (55.zip)

Analytics/BI-Schicht über One-Piece: KPIs, Dashboard, ROAS, Cohorts, Forecasting, Anomalien, Decision Intelligence.

| CLI | Zweck |
|-----|-------|
| `complete-analytics-demo` | Demo: KPIs, Dashboard, Cohorts, Forecast |
| `complete-analytics-docs` | Analytics & BI Dokumentation |

API: `GET /analytics/demo`, `GET /analytics/dashboard`

```bash
cd intelligence
python3 main.py complete-analytics-demo
```

Archive: `intelligence/archive/BUZZARD_MAXIMAL_ANALYTICS_BI_ONE_PIECE_ALLES_IN_EINEM_ORDNER.zip` (identisch mit `55.zip`)

## Buzzard Production MAX — neu (wichtig.zip)

Storefront-Foundation: Katalog, Warenkorb, Checkout, Import, Profitability Guard, Provider-Registry, Go-Live-Readiness.

| CLI | Zweck |
|-----|-------|
| `complete-production-demo` | Demo: Catalog, Cart, Checkout, Integrations |
| `complete-production-readiness` | Go-Live Readiness Gate |
| `complete-production-docs` | Production MAX Dokumentation |

API: `GET /production/*`, `GET/POST /storefront/*`

```bash
cd intelligence
python3 main.py complete-production-demo
python3 main.py complete-production-readiness
```

Archive: `intelligence/archive/BUZZARD_MAXIMAL_PRODUCTION_ONE_PIECE_ALLES_IN_EINEM_ORDNER.zip` (identisch mit `wichtig.zip`)

## Shop Intelligence Commerce Bridge MAXIMAL — neu

Python-Bridge zwischen Production Storefront, Commerce Events und Analytics/Decision Hooks. Verkauf bleibt blockiert bis Catalog, Payment, Shipping, Order Pipeline und Intelligence Bridge READY melden.

| CLI | Zweck |
|-----|-------|
| `complete-shop-bridge-demo` | Demo: Order Lifecycle + Commerce Events |
| `complete-shop-bridge-readiness` | Sales Readiness Gate |
| `complete-shop-bridge-docs` | Bridge-Dokumentation |

API: `GET /shop-bridge/readiness`, `GET /shop-bridge/demo`

Node Shop liest zusätzlich `/shop-bridge/readiness` über `BUZZARD_INTELLIGENCE_API_URL`.

```bash
cd intelligence
python3 main.py complete-shop-bridge-demo
python3 main.py complete-shop-bridge-readiness
```

Archive: `intelligence/archive/BUZZARD_SHOP_INTELLIGENCE_COMMERCE_BRIDGE_MAXIMAL_ONE_PIECE.zip`

## Master Taxonomy MAXIMAL — neu

Produktionsreife Master-Taxonomie mit 43 Hauptkategorien und 1198 Knoten (Hauptkategorie → Unterkategorie → Unter-Unterkategorie → Produkt).

| CLI | Zweck |
|-----|-------|
| `complete-taxonomy-demo` | Demo: Snapshot, Pfad, Suche |
| `complete-taxonomy-search` | Suche nach Name/Slug |
| `complete-taxonomy-path` | Breadcrumb-Pfad für Node-ID |
| `complete-taxonomy-snapshot` | Statistik & Dateipfade |
| `complete-taxonomy-docs` | Vollständiger Kategoriebaum (Markdown) |

API: `GET /taxonomy`, `GET /taxonomy/categories`, `GET /taxonomy/category/{id}`, `GET /taxonomy/search`

```bash
cd intelligence
python3 main.py complete-taxonomy-demo
python3 main.py complete-taxonomy-search --q motor
python3 main.py complete-taxonomy-path --id 01.01.01
```

Archive: `intelligence/archive/BUZZARD_MASTER_TAXONOMY_MAXIMAL.zip`

## Master Taxonomy Unification MAXIMAL — neu

Vereinigt Shop (41-root `cat-*`) und Intelligence (43-root) unter canonical `bz.*` IDs mit Alias-Mapping.

| CLI | Zweck |
|-----|-------|
| `complete-taxonomy-unify-status` | Unification-Status |
| `complete-taxonomy-unify-resolve` | Legacy-ID → canonical `bz.*` |
| `complete-taxonomy-unify-docs` | Dokumentation + Migrations-SQL |

API: `GET /taxonomy/status`, `GET /taxonomy/resolve?legacy_id=cat-01&system=shop`

```bash
cd intelligence
python3 main.py complete-taxonomy-unify-resolve --legacy-id cat-01 --system shop
```

Archive: `intelligence/archive/BUZZARD_MASTER_TAXONOMY_UNIFICATION_MAXIMAL.zip`

## PIM Product Master MAXIMAL — neu

Product Information Management: single product master source, supplier import pipeline, deduplication, quality gate with canonical `bz.*` categories.

| CLI | Zweck |
|-----|-------|
| `complete-pim-demo` | Demo import + quality gate |
| `complete-pim-health` | PIM service health |
| `complete-pim-schema` | Product master + supplier import schemas |
| `complete-pim-docs` | PIM documentation |

API: `GET /pim/health`, `GET /pim/schema`, `POST /pim/import/process`, `POST /pim/validate`

```bash
cd intelligence
python3 main.py complete-pim-demo
```

Archive: `intelligence/archive/BUZZARD_PIM_PRODUCT_MASTER_MAXIMAL.zip`

## Multilingual Product Intelligence MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-multilingual-health` | Multilingual service health |
| `complete-multilingual-languages` | 59 unterstützte Sprachen |
| `complete-multilingual-normalize` | Text normalisieren (`--text`, optional `--language`) |
| `complete-multilingual-demo` | Demo-Flow (DE/TR/AR) |
| `complete-multilingual-docs` | Dokumentation |

API: `GET /multilingual/health`, `GET /multilingual/languages`, `POST /multilingual/normalize`, `GET /multilingual/glossary`, `GET /multilingual/demo`

```bash
cd intelligence
python3 main.py complete-multilingual-demo
```

Archive: `intelligence/archive/BUZZARD_MULTILINGUAL_PRODUCT_INTELLIGENCE_MAXIMAL.zip`

## Supplier Import & Enrichment Engine MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-import-engine-health` | Import-Engine Health |
| `complete-import-engine-demo` | Demo-Feed (dry-run) |
| `complete-import-engine-schema` | Decision + normalized record schemas |
| `complete-import-engine-docs` | Dokumentation |

API: `GET /import-engine/health`, `POST /import-engine/preview`, `GET /import-engine/demo`

```bash
cd intelligence
python3 main.py complete-import-engine-demo
```

Archive: `intelligence/archive/BUZZARD_SUPPLIER_IMPORT_ENRICHMENT_ENGINE_MAXIMAL.zip`

## AI Phone Assistant MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-phone-health` | Phone Assistant Health |
| `complete-phone-analyze` | Intent + Entities (`--text`, optional `--language`) |
| `complete-phone-demo` | Demo-Flow (DE/AR/Human handoff) |
| `complete-phone-schema` | Tool + Conversation State Schemas |
| `complete-phone-docs` | Dokumentation |

API: `GET /phone/health`, `POST /phone/analyze`, `GET /phone/demo`

```bash
cd intelligence
python3 main.py complete-phone-demo
```

Archive: `intelligence/archive/BUZZARD_AI_PHONE_ASSISTANT_MAXIMAL.zip`

## AI Phone Assistant V2 — Memory & CRM

| Command | Beschreibung |
|---------|--------------|
| `complete-phone-memory-health` | Memory/CRM service health |
| `complete-phone-memory-demo` | Demo (customer + verified/unverified context) |
| `complete-phone-memory-context` | Agent context (`--customer-id`, `--verification-level`) |
| `complete-phone-memory-docs` | Dokumentation |

API: `GET /phone/memory/health`, `POST /phone/memory/customer`, `GET /phone/memory/context/{id}`, `GET /phone/memory/demo`

```bash
cd intelligence
python3 main.py complete-phone-memory-demo
```

Archive: `intelligence/archive/BUZZARD_AI_PHONE_ASSISTANT_MAXIMAL_V2_MEMORY_CRM.zip`

## AI Phone Assistant V3 — Telephony FINAL

| Command | Beschreibung |
|---------|--------------|
| `complete-phone-telephony-health` | Telephony V3 health |
| `complete-phone-telephony-demo` | Inbound call demo (dry-run) |
| `complete-phone-telephony-schema` | Call + production config schemas |
| `complete-phone-telephony-docs` | Dokumentation |

API: `GET /phone/telephony/health`, `POST /phone/telephony/inbound`, `GET /phone/telephony/demo`

```bash
cd intelligence
python3 main.py complete-phone-telephony-demo
```

Archive: `intelligence/archive/BUZZARD_AI_PHONE_ASSISTANT_MAXIMAL_FINAL_V3_TELEPHONY.zip`

## Complete Commerce Platform MAXIMAL FINAL

| Command | Beschreibung |
|---------|--------------|
| `complete-platform-health` | Unified platform health |
| `complete-platform-modules` | Alle Module (taxonomy → phone_ai) |
| `complete-platform-demo` | Dry-run Checkout/Order/Event/Audit Demo |
| `complete-platform-schema` | Events, Order, Security, Channel Policies |
| `complete-platform-docs` | Dokumentation |

API: `GET /platform/health`, `GET /platform/modules`, `GET /platform/demo`

```bash
cd intelligence
python3 main.py complete-platform-demo
```

Archive: `intelligence/archive/BUZZARD_COMPLETE_COMMERCE_PLATFORM_MAXIMAL_FINAL.zip`

## Production Integration MAXIMAL ONE PACKAGE

| Command | Beschreibung |
|---------|--------------|
| `complete-production-integration-health` | Production integration health |
| `complete-production-integration-readiness` | Readiness checks (HTTPS, webhooks, config) |
| `complete-production-integration-demo` | Integration + business engine demo |
| `complete-production-integration-schema` | Config + provider + engine schemas |
| `complete-production-integration-docs` | Dokumentation + Runbook |

API: `GET /production/health`, `GET /production/readiness`, `GET /production/demo`

```bash
cd intelligence
python3 main.py complete-production-integration-demo
```

Archive: `intelligence/archive/BUZZARD_PRODUCTION_INTEGRATION_MAXIMAL_ONE_PACKAGE.zip`

## Launch Sequence MAXIMAL ONE PACKAGE

| Command | Beschreibung |
|---------|--------------|
| `complete-launch-sequence-health` | Launch sequence health |
| `complete-launch-sequence-stages` | 9 Launch-Stufen + aktueller State |
| `complete-launch-sequence-demo` | PIM-Import, Supplier-Sync, E2E-Dry-Run Demo |
| `complete-launch-sequence-schema` | PIM-Import, Payment, Shipping, Marketplace, Telephony Schemas |
| `complete-launch-sequence-docs` | Dokumentation + Runbook |

API: `GET /launch/health`, `GET /launch/stages`, `GET /launch/sequence`, `GET /launch/schema/pim-import`, `GET /launch/demo`

`live_activation: false` — Sales bleiben aus; externe Accounts (Payment, Carrier, Marketplace, Telephony) weiterhin manuell.

```bash
cd intelligence
python3 main.py complete-launch-sequence-demo
```

Archive: `intelligence/archive/BUZZARD_LAUNCH_SEQUENCE_MAXIMAL_ONE_PACKAGE.zip`

## AI Council 18 UNIFIED MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-ai-council-18-health` | Council health (18 agents, shared memory) |
| `complete-ai-council-18-agents` | Liste aller 18 Spezialisten |
| `complete-ai-council-18-demo` | Vollständiger Council-Case + Inter-Agent-Kontext |
| `complete-ai-council-18-schema` | Finding-Schema + Council-Konfiguration |
| `complete-ai-council-18-docs` | Architektur + Interaction Matrix |

API: `GET /council-18/health`, `GET /council-18/agents`, `GET /council-18/case`, `GET /council-18/schema`, `GET /council-18/demo`

`live_activation: false` — keine autonomen Markt-/Preis-/Publikationsentscheidungen ohne Human Approval.

```bash
cd intelligence
python3 main.py complete-ai-council-18-demo
```

Archive: `intelligence/archive/BUZZARD_AI_COUNCIL_18_UNIFIED_MAXIMAL.zip`

## AI Council 19 CUSTOMS BUREAUCRACY MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-ai-council-19-health` | Customs council health (19 agents) |
| `complete-ai-council-19-agents` | Liste aller 19 Council-Agenten |
| `complete-ai-council-19-assess` | Zoll-/Handels-Assessment Demo |
| `complete-ai-council-19-demo` | Vollständiger Council-19 Demo-Flow |
| `complete-ai-council-19-schema` | Assessment-Schema + Customs-Konfiguration |
| `complete-ai-council-19-docs` | Dokumentation + Source Policy |

API: `GET /council-19/health`, `GET /council-19/agents`, `GET /council-19/assess`, `GET /council-19/schema`, `GET /council-19/demo`

`live_activation: false` — keine bindenden Zollentscheidungen; offizielle Quellen erforderlich.

```bash
cd intelligence
python3 main.py complete-ai-council-19-assess
```

Archive: `intelligence/archive/BUZZARD_AI_COUNCIL_19_CUSTOMS_BUREAUCRACY_MAXIMAL.zip`

## 43 Category Intelligence MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-category-intelligence-43-health` | 43 category intelligence health |
| `complete-category-intelligence-43-agents` | Liste aller 43 Category-Agenten |
| `complete-category-intelligence-43-demo` | Preis-/Taxonomy-Gap Demo |
| `complete-category-intelligence-43-schema` | Report-Schema + Monitoring-Konfiguration |
| `complete-category-intelligence-43-docs` | Architektur-Dokumentation |

API: `GET /category-intelligence-43/health`, `GET /category-intelligence-43/agents`, `GET /category-intelligence-43/analyze`, `GET /category-intelligence-43/schema`, `GET /category-intelligence-43/demo`

`live_activation: false` — nur öffentliche Quellen; Taxonomy-/Preisänderungen mit Human Approval.

```bash
cd intelligence
python3 main.py complete-category-intelligence-43-demo
```

Archive: `intelligence/archive/BUZZARD_43_CATEGORY_INTELLIGENCE_MAXIMAL.zip`

## Social Intelligence AI MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-social-intelligence-health` | Social intelligence health (9 platforms) |
| `complete-social-intelligence-platforms` | Liste aller Platform-Adapter |
| `complete-social-intelligence-demo` | Cross-Platform Signal Demo |
| `complete-social-intelligence-schema` | Signal-Schema + Konfiguration |
| `complete-social-intelligence-docs` | Dokumentation + Connector Matrix |

API: `GET /social-intelligence/health`, `GET /social-intelligence/platforms`, `GET /social-intelligence/schema`, `GET /social-intelligence/demo`

`live_activation: false` — nur public/authorized Quellen; kein Auto-Posting/Ad-Spend.

```bash
cd intelligence
python3 main.py complete-social-intelligence-demo
```

Archive: `intelligence/archive/BUZZARD_SOCIAL_INTELLIGENCE_AI_MAXIMAL.zip`

## Automotive Taxonomy MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-automotive-taxonomy-health` | Automotive taxonomy health |
| `complete-automotive-taxonomy-seed` | 90+ Master Vehicle Need Systems |
| `complete-automotive-taxonomy-demo` | Taxonomy-Pfad, Selector, Fitment Demo |
| `complete-automotive-taxonomy-schema` | Taxonomy-Schema + Konfiguration |
| `complete-automotive-taxonomy-docs` | Architektur-Dokumentation |

API: `GET /automotive-taxonomy/health`, `GET /automotive-taxonomy/seed`, `GET /automotive-taxonomy/schema`, `GET /automotive-taxonomy/demo`

`live_activation: false` — Fitment erfordert Evidenz; kein automatisches Fitment-Publishing.

```bash
cd intelligence
python3 main.py complete-automotive-taxonomy-demo
```

Archive: `intelligence/archive/BUZZARD_AUTOMOTIVE_TAXONOMY_MAXIMAL.zip`

## Automotive Taxonomy — Tires MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-automotive-taxonomy-tires-categories` | 12 Fahrzeugtypen + tiefe Reifen-Unterkategorien |
| `complete-automotive-taxonomy-tires-demo` | Größenvalidierung, Suche, Fitment-Demo |
| `complete-automotive-taxonomy-tires-schema` | Reifen-Produktionskonfiguration |
| `complete-automotive-taxonomy-tires-docs` | Reifen-Kategorie-Dokumentation |

API: `GET /automotive-taxonomy/tires/categories`, `GET /automotive-taxonomy/tires/demo`, `GET /automotive-taxonomy/tires/config`

Separate Kategorie: **Otomotiv → Lastikler** (nicht nur Unterprodukt von Rädern). 12 Fahrzeugtypen, 18 vehicle_scope, Größenvalidierung.

```bash
cd intelligence
python3 main.py complete-automotive-taxonomy-tires-demo
```

Archive: `intelligence/archive/BUZZARD_AUTOMOTIVE_TAXONOMY_MAXIMAL_WITH_TIRES.zip`

## Agriculture MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-agriculture-health` | Agriculture taxonomy health |
| `complete-agriculture-branches` | 9 Branches + Taxonomie-Knoten |
| `complete-agriculture-demo` | Katalog, Fitment, Market Signals, Gap Detection |
| `complete-agriculture-schema` | Taxonomy-Schema + Konfiguration |
| `complete-agriculture-docs` | Architektur-Dokumentation |

API: `GET /agriculture/health`, `GET /agriculture/branches`, `GET /agriculture/schema`, `GET /agriculture/demo`

Separate Hauptkategorie: **Tarım & Tarım Makineleri**. Machine-need-first Architektur mit 9 Branches.

`live_activation: false` — Fitment erfordert Evidenz; Konflikte → Human Review.

```bash
cd intelligence
python3 main.py complete-agriculture-demo
```

Archive: `intelligence/archive/BUZZARD_AGRICULTURE_MAXIMAL.zip`

## Renewable Energy MAXIMAL

| Command | Beschreibung |
|---------|--------------|
| `complete-renewable-energy-health` | Renewable energy taxonomy health |
| `complete-renewable-energy-branches` | 9 Branches + Taxonomie-Knoten |
| `complete-renewable-energy-demo` | Katalog, Kompatibilität, Market Signals, Gap Detection |
| `complete-renewable-energy-schema` | Taxonomy-Schema + Konfiguration |
| `complete-renewable-energy-docs` | Architektur-Dokumentation |

API: `GET /renewable-energy/health`, `GET /renewable-energy/branches`, `GET /renewable-energy/schema`, `GET /renewable-energy/demo`

Separate Hauptkategorie: **Yenilenebilir Enerji**. Solar, Wind, Storage, Hybrid und mehr.

`live_activation: false` — Kompatibilität erfordert Evidenz; Konflikte → Human Review.

```bash
cd intelligence
python3 main.py complete-renewable-energy-demo
```

Archive: `intelligence/archive/buzzard_renewable_energy_maximal.py`

## v28 Product Selection — neu

Automatisierte Produktauswahl aus Intelligence-Signalen — **keine Einkaufs- oder Rechtsentscheidung**.

| Feature | Beschreibung |
|---------|--------------|
| Signale | Rentabilität, Nachfrage, Preis/Markt, Lieferant, Risiko, Vertrauen |
| Entscheidungen | PRIORITY, REVIEW, HOLD, REJECT |
| Schwellwert | Nettogewinn < €0,50 → REJECT |
| Regel | Fehlende kritische Daten → REVIEW/HOLD |

### CLI

```bash
cd intelligence
python main.py init-v28
python main.py selection-demo
python main.py selection-report
python main.py selection-add --name "5W-30 Motoröl" --category "Automotive" --profit 2.40 --demand 85 --price 80 --market 82 --supplier 90 --risk 15 --trust 92
```

## v27 Supplier Matching — neu

Lieferanten-Ranking für Produkt/Kategorie — **Recherche-Priorität, keine Freigabe**.

| Feature | Beschreibung |
|---------|--------------|
| Lieferanten | Vertrauen, Integration, Logistik, Risiko, Dropshipping, White-Label, Nachweise |
| Matching | Gewichteter Score mit erklärbaren Gründen |
| Status | TOP_PRIORITY, GOOD_CANDIDATE, LOW_PRIORITY, REVIEW |
| Regel | Fehlende Daten ≠ hohe Konfidenz; Risiko/Authentizität separat prüfen |

### CLI

```bash
cd intelligence
python main.py init-v27
python main.py supplier-match-demo
python main.py supplier-match-report
python main.py supplier-match-add --name "Example Supplier" --category "Automotive" --trust 85 --integration 90 --logistics 80 --risk 15
python main.py supplier-match-run --product "5W-30 Motoröl" --category "Automotive"
```

## v26 Demand Forecasting — neu

Nachfrage-Prognose aus Zeitreihen-Signalen — **Entscheidungshilfe, keine Verkaufsgarantie**.

| Feature | Beschreibung |
|---------|--------------|
| Beobachtungen | Produkt-ID, Periode, Nachfragewert |
| Prognose | Trend, Richtung (RISING/FALLING/STABLE), Forecast-Wert |
| Konfidenz | Datenmenge-basiert, max. 0,95 |
| Regel | Mindestens 3 Beobachtungen; Saison/Kampagnen separat modellieren |

### CLI

```bash
cd intelligence
python main.py init-v26
python main.py demand-demo
python main.py demand-report
python main.py demand-observation --product-id "EAN-123" --value 120 --period "2026-08-01"
python main.py demand-forecast --product-id "EAN-123" --window 7
```

## v25 Price Intelligence — neu

Preisbeobachtungen aus offenen Quellen über die Zeit — **keine Verkaufs- oder Gewinngarantie**.

| Feature | Beschreibung |
|---------|--------------|
| Beobachtungen | Produkt-ID, Verkäufer, Preis, Währung, Versand, MwSt., Quelle, Zeitstempel |
| Signale | PRICE_UP / PRICE_DOWN bei ≥1 % Änderung |
| Statistik | Min, Max, Durchschnitt je Produkt |
| Regel | Versand/MwSt./Varianten bei Vergleichen berücksichtigen |

### CLI

```bash
cd intelligence
python main.py init-v25
python main.py price-demo
python main.py price-report
python main.py price-add --product-id "EAN-123" --seller "Example Store" --price 49.90 --currency EUR --source "https://example.com/product"
python main.py price-changes --product-id "EAN-123"
```

## v24 Product Matching — neu

Kernschicht für Produktidentität über Quellen hinweg — **kein automatisches Match nur nach Name**.

| Feature | Beschreibung |
|---------|--------------|
| Kanonische Produkte | Name, Marke, Kategorie, Variante |
| Listings | Quell-Listings mit EAN, GTIN, MPN, OEM, URL |
| Matching | Score 0–100 mit erklärbaren Signalen |
| Status | HIGH_CONFIDENCE, REVIEW, LOW_CONFIDENCE |
| Regel | Widersprüchliche IDs = Negativsignal; kein Originalitätsbeweis |

### CLI

```bash
cd intelligence
python main.py init-v24
python main.py match-demo
python main.py match-report
python main.py match-canonical --name "5W-30 Motoröl" --brand "Example" --category "Automotive"
python main.py match-listing --canonical-id 1 --source "Example Store" --name "Example 5W30" --ean "1234567890123" --mpn "ABC-5W30" --url "https://example.com/product"
python main.py match-analyze --listing-id 1 --candidate-id 2
```

## v23 Connector Hub — neu

Zentraler Connector-Layer für autorisierte API-/Feed-Verbindungen — **keine API-Keys im Code**.

| Feature | Beschreibung |
|---------|--------------|
| Connectors | Name, Typ, Base-URL, Env-Variable für API-Key |
| Capabilities | Produkte, Preise, Bestand, Bestellungen, Tracking (inbound/outbound) |
| Health | UNKNOWN, HEALTHY, DEGRADED, ERROR, DISABLED |
| Sync-Runs | Protokoll für Synchronisationsläufe |
| Regel | Nur offizielle/autorisierte Verbindungen; Adapter je Provider |

### CLI

```bash
cd intelligence
python main.py init-v23
python main.py connector-demo
python main.py connector-report
python main.py connector-add --name "Example Supplier API" --kind supplier --base-url "https://api.example.com" --key-env "BUZZARD_EXAMPLE_KEY"
python main.py connector-capability --connector "Example Supplier API" --name products --direction inbound
python main.py connector-health --connector "Example Supplier API" --status healthy
```

Echte Provider-Adapter werden separat angebunden.

## v22 Web Research — neu

Strukturierte, legale Web-Recherche für den Council — **kein Scraping-Umgehung, keine erfundenen Fakten**.

| Feature | Beschreibung |
|---------|--------------|
| Aufgaben | Query, Zweck, Status |
| Quellen | URL, Titel, Domain, Öffentlichkeit |
| Erkenntnisse | Claim + Konfidenz, verknüpft mit Quelle |
| Regeln | robots.txt respektieren; Einzelquelle ≠ verifiziert |

### CLI

```bash
cd intelligence
python main.py init-v22
python main.py research-demo
python main.py research-report
python main.py research-create --query "Germany automotive aftermarket trends" --purpose "Market Intelligence"
python main.py research-source --research-id 1 --url "https://example.com" --title "Example source" --domain "example.com"
python main.py research-finding --research-id 1 --source-id 1 --claim "Example claim" --confidence 0.85
```

Echte Such-/Fetch-Adapter werden separat angebunden.

## v21 AI Agent Gateway

Provider-unabhängiges Gateway für echte AI-Modelle — **keine automatischen Handelsentscheidungen**.

| Feature | Beschreibung |
|---------|--------------|
| Provider | Konfiguration über Env-Variablen (keine Keys im Code) |
| Agent-Profile | Rollen für Market, Supplier, Risk, Council Manager, … |
| Aufrufe | `call_provider()` mit Adapter-Schnittstelle |
| Regel | AI-Ausgabe als Meinung/S Signal — v20 Council bewertet |

### CLI

```bash
cd intelligence
python main.py init-v21
python main.py ai-demo
python main.py ai-providers
python main.py ai-add-provider --name openai --base-url "https://api.openai.com/v1/chat/completions" --model gpt-4o --api-key-env OPENAI_API_KEY
```

### Umgebungsvariablen (Beispiel)

```bash
export BUZZARD_AI_API_KEY="..."
export OPENAI_API_KEY="..."
```

Echte Provider-Integration erfordert einen Adapter gemäß offizieller API-Dokumentation.

## v20 Council Orchestrator

Erweitert v10 Council um Aufgabenverteilung, Expertenmeinungen und Orchestrierung — **keine automatische Endentscheidung**.

| Feature | Beschreibung |
|---------|--------------|
| Experten | Market, Category, Competitor, Supplier, Trust, Profit, Risk, … |
| Aufgaben | Priorität, Status, Zuweisung, Abhängigkeiten |
| Meinungen | Mehrere Expertenmeinungen pro Aufgabe (auch widersprüchlich) |
| Regel | Finale Handelsentscheidung beim Menschen |

### CLI

```bash
cd intelligence
python main.py init-v20
python main.py orch-demo
python main.py orch-board
python main.py orch-create --title "5W-30 Motoröl Recherche" --priority 9
python main.py orch-assign --task-id 1 --agent "Supplier Intelligence"
python main.py orch-opinion --task-id 1 --agent "Risk & Compliance" --decision REVIEW --confidence 0.90 --note "Dokumentenprüfung erforderlich"
```

**Hinweis:** v10 `council-board` = Review-Posteingang · v20 `orch-board` = Orchestrator-Pinnwand.

## v19 Risk & Compliance

Zentralisierte Risiko- und Compliance-Signale für Produkte, Lieferanten und Märkte — **keine Rechtsberatung**.

| Feature | Beschreibung |
|---------|--------------|
| Risikotypen | AUTHENTICITY, SUPPLIER, PRODUCT_SAFETY, CUSTOMS, TAX, IP_TRADEMARK, … |
| Schweregrad | LOW, MEDIUM, HIGH, CRITICAL |
| Status | OPEN → UNDER_REVIEW → VERIFIED / RESOLVED / REJECTED |
| Priorität | Score 0–100; fehlende Quelle erhöht Priorität |

### CLI

```bash
cd intelligence
python main.py init-v19
python main.py risk-demo
python main.py risk-report
python main.py risk-add --entity "Beispiel Produkt" --type PRODUCT_SAFETY --severity HIGH --source official-source --country DE
python main.py risk-verify --risk-id 1 --status UNDER_REVIEW --note "Prüfung gestartet"
```

## v18 Supplier Intelligence

Systematische Lieferantenrecherche und Integrationsbewertung — **keine automatische „vertrauenswürdig“-Markierung**.

| Feature | Beschreibung |
|---------|--------------|
| Lieferanten | Name, Land, B2B-Status, Quelle |
| Fähigkeiten | API, XML, Dropshipping, TecDoc, White-label, … |
| Scores | Vertrauens- und Integrationsscore (recherchebasiert) |
| Regel | Offizielle Dokumentation separat verifizieren |

### CLI

```bash
cd intelligence
python main.py init-v18
python main.py supplier-demo
python main.py supplier-report
python main.py supplier-add --name "Example Supplier" --country DE --b2b yes --source "https://example.com"
python main.py supplier-capability --supplier "Example Supplier" --capability API --status verified --evidence "https://example.com/api-docs"
```

## v17 Market Opportunity

Länder- und Marktvergleich für Produkt-/Kategoriechancen — **keine Verkaufs- oder Gewinngarantie**.

| Feature | Beschreibung |
|---------|--------------|
| Märkte | Nachfrage, Wettbewerb, Logistik, Risiko je Land |
| Chancen | Produktscores über Länder hinweg |
| Datenabdeckung | Fehlende Werte werden als Lücken markiert, nicht als 0 |
| Fokus | DE, EU, TR, Golfregion |

### CLI

```bash
cd intelligence
python main.py init-v17
python main.py market-demo
python main.py market-report
python main.py market-add --country DE --market Deutschland --demand 80 --competition 60 --logistics 85 --risk 20
python main.py opportunity-add --country DE --category Automotive --product "5W-30 Motoröl" --demand 85 --competition 55 --margin 75 --logistics 80 --risk 20
```

## v16 Profitability

Produktbezogene Rentabilitätsberechnung mit mathematischer Entscheidungshilfe — **kein Ersatz für Steuerberatung**.

| Feature | Beschreibung |
|---------|--------------|
| Kosten | Einkauf, Versand, Marktplatz-, Zahlungs-, Werbe-, Verpackungskosten |
| Steuer | MwSt./Steuer als direkter EUR-Aufwand |
| Schwellwert | Nettogewinn < €0,50 → `GEWINN_ZU_GERING` |
| Status | GEEIGNET, GEWINN_ZU_GERING, VERLUST |

### CLI

```bash
cd intelligence
python main.py init-v16
python main.py profit-demo
python main.py profit-report
python main.py profit-calc --name "Beispiel Produkt" --sale 29.90 --cost 12 --shipping 4 --marketplace 2.99 --payment 0.90 --ads 2 --packaging 0.50 --other 0.30 --tax 0
```

## v15 Authenticity & Trust

Vertrauens- und Authentizitätssignale für Produkte, Marken und Lieferanten — **keine automatische „Original“-Markierung**.

| Feature | Beschreibung |
|---------|--------------|
| Status | UNVERIFIED, PENDING, VERIFIED, REJECTED, DISPUTED |
| Nachweise | Rechnungen, Herstellerdaten, Lieferantendokumente |
| Vertrauensscore | Erklärbarer Score je Verifizierungsstatus |
| Risiko | Signale statt Fälschungsvorwürfe — menschliche Prüfung möglich |

### CLI

```bash
cd intelligence
python main.py init-v15
python main.py trust-demo
python main.py trust-report
python main.py trust-product --name "Beispiel Produkt" --brand "Example" --supplier "Example Supplier"
python main.py trust-evidence --product-id 1 --type INVOICE --issuer "Example Supplier" --reference "DOC-001"
python main.py trust-verify --product-id 1 --status VERIFIED --note "Quelle geprüft"
```

## v14 Competitor Intelligence

Legale Wettbewerbs- und Marktbeobachtungen aus **öffentlichen Quellen** — keine Scraping-Umgehung, keine privaten Daten.

| Feature | Beschreibung |
|---------|--------------|
| Wettbewerber | Öffentliche Shops/Marktplätze mit Land und Quelle |
| Kategorien | Sichtbare Haupt-/Unterkategorien pro Wettbewerber |
| Produkte | Veröffentlichte Preise, Marken, Popularitätssignale |
| Ethik | Nur legale, öffentliche Informationen |

### CLI

```bash
cd intelligence
python main.py init-v14
python main.py competitor-demo
python main.py competitor-report
python main.py competitor-add --name "Example Store" --country DE --source "https://example.com"
python main.py competitor-product --competitor "Example Store" --category Automotive --name "Beispiel Produkt" --price 49.90 --currency EUR --source "https://example.com/product"
```

## v13 Multilingual Intelligence

Mehrsprachige Begriffs- und Entitätszuordnung — unabhängig von v2 Produkt-Memory.

| Feature | Beschreibung |
|---------|--------------|
| Sprachen | tr, de, en, ar, fr, es, it, nl, pl |
| Kanonische Entitäten | Produkt-/Kategoriebegriffe über Sprachen hinweg |
| Quellen & Konfidenz | Automatische Übersetzungen bleiben UNVERIFIED |
| Sprachabdeckung | Beobachtungen und Quellen pro Sprache |

### CLI

```bash
cd intelligence
python main.py init-v13
python main.py ml-demo
python main.py ml-report
python main.py term-add --language de --text "Motoröl 5W-30" --canonical "5W-30 Motor Yağı" --entity product
```

## v12 Shared Memory

Langfristige gemeinsame Wissensbasis — unabhängig von v2 Produkt-Memory und v11 Voice.

| Feature | Beschreibung |
|---------|--------------|
| Typen | DECISION, TASK, PREFERENCE, CONVERSATION, ENTITY, … |
| Status | ACTIVE, VERIFIED, DISPUTED, ARCHIVED, REJECTED |
| Tags & Links | Etiketten und Verknüpfungen zwischen Einträgen |
| Audit | Änderungsverlauf pro Eintrag |

### CLI

```bash
cd intelligence
python main.py init-v12
python main.py remember --type DECISION --text "Buzzard fokussiert zuerst auf Deutschland und EU." --source user
python main.py recall --query "Deutschland"
python main.py shared-timeline
python main.py memory-status --id 1 --status VERIFIED
```

**Hinweis:** v2 `memory <query>` durchsucht Produkt-/Marktbeobachtungen; v12 `recall` durchsucht Shared Memory.

## v11 Voice Interface

Lokale Sprach-Oberfläche mit Flask + Browser Speech API.

| Feature | Beschreibung |
|---------|--------------|
| Spracheingabe | Browser Speech Recognition (DE/TR) |
| Sprachausgabe | Speech Synthesis |
| REST | `POST /api/message`, `GET /api/health` |
| Backend | Routet zu v9 `Reporter` und v10 `Council` |

### Start

```bash
cd intelligence
pip install -r requirements.txt
python main.py voice
```

Öffne: http://127.0.0.1:8787

### Sprachbefehle (Beispiele)

- „Bericht“ / „Status“ → Management-Report (Auszug)
- „Warnungen“ / „Alerts“ → aktive v9-Warnungen
- „Posteingang“ / „Inbox“ → v10 Review-Posteingang
- „Hilfe“ → verfügbare Befehle

### Wichtig

- Kein eigenes Sprach-KI-Modell
- Keine persistente Konversationshistorie in v11
- Produktion: externer STT/TTS-Provider über Backend empfohlen
- Browser-Support für Speech Recognition variiert

## v10–v1

Council, Reporting, Discovery, … — unverändert nutzbar.

## Grenzen

- Keine Shop-/Katalog-Änderungen
- Voice-Server nur lokal (`127.0.0.1:8787`)

## Dateien

```
intelligence/
├── buzzard_intelligence/
│   ├── shared_memory.py
│   ├── multilingual.py
│   ├── competitor.py
│   ├── trust.py
│   ├── profit.py
│   ├── market.py
│   ├── supplier.py
│   ├── risk.py
│   ├── orchestrator.py
│   ├── gateway.py
│   ├── research.py
│   ├── connectors.py
│   ├── matcher.py
│   ├── price.py
│   ├── forecast.py
│   ├── supplier_match.py
│   ├── selection.py
│   ├── verify.py
│   ├── aslan.py
│   ├── mission.py
│   ├── learning_memory.py
│   ├── categories.py
│   ├── competitor_monitor.py
│   ├── json_store.py
│   ├── anomaly.py
│   ├── taxonomy.py
│   ├── geography.py
│   ├── compliance_intel.py
│   ├── scenario.py
│   ├── intel_dashboard.py
│   ├── master_core.py
│   ├── authorized_research.py
│   ├── public_connectors.py
│   ├── normalization.py
│   ├── source_reliability.py
│   ├── change_detection.py
│   ├── rival_product.py
│   ├── rival_category.py
│   ├── rival_price.py
│   ├── market_radar.py
│   ├── opportunity_discovery.py
│   ├── product_radar.py
│   ├── brand_intel.py
│   ├── supplier_verify.py
│   ├── supplier_performance.py
│   ├── supplier_price.py
│   ├── stock_intel.py
│   ├── shipping_intel.py
│   ├── marketplace_intel.py
│   ├── seo_intel.py
│   ├── advertising_intel.py
│   ├── review_intel.py
│   ├── promotion_intel.py
│   ├── seasonality_intel.py
│   ├── crossborder_intel.py
│   ├── eu_compliance.py
│   ├── fx_intel.py
│   ├── landed_cost.py
│   ├── profit_optimizer.py
│   ├── portfolio_manager.py
│   ├── command_center.py
│   ├── research_jobs.py
│   ├── data_quality.py
│   ├── multi_agent.py
│   ├── hypothesis.py
│   ├── fact_check.py
│   ├── opportunity_rank.py
│   ├── product_discovery.py
│   ├── supplier_discovery.py
│   ├── market_entry.py
│   ├── workflow_auto.py
│   ├── price_optimize.py
│   ├── margin_intel.py
│   ├── roas_intel.py
│   ├── inventory_plan.py
│   ├── demand_purchase.py
│   ├── purchase_price.py
│   ├── cross_sell.py
│   ├── bundle_intel.py
│   ├── assortment_opt.py
│   ├── cat_portfolio.py
│   ├── germany_market.py
│   ├── eu_market.py
│   ├── turkey_market.py
│   ├── gulf_market.py
│   ├── intl_expansion.py
│   ├── global_currency.py
│   ├── global_customs.py
│   ├── global_logistics.py
│   ├── local_marketplace.py
│   ├── ai_center.py
│   ├── error_handling.py
│   ├── input_validation.py
│   ├── schema_validation.py
│   ├── api_retry.py
│   ├── rate_limit.py
│   ├── circuit_breaker.py
│   ├── credential_validation.py
│   ├── data_integrity.py
│   ├── conflict_resolution.py
│   ├── source_freshness.py
│   ├── data_provenance.py
│   ├── audit_integrity.py
│   ├── agent_health.py
│   ├── mission_recovery.py
│   ├── queue_recovery.py
│   ├── approval_guardrails.py
│   ├── backup_restore.py
│   ├── system_health.py
│   ├── integration_tests.py
│   ├── error_center.py
│   ├── security_arch.py … business_ai_center.py (v121–v200, 80 Module)
│   └── …
├── error_resilience/
│   └── MASTER_ERROR_CHECKLIST.md
├── ROADMAP.md
├── live_connectors/
│   ├── amazon_creators.py
│   ├── ebay.py
│   ├── google_ads.py
│   ├── public_fetch.py
│   ├── health.py
│   ├── README.md
│   ├── CONNECT_STATUS.md
│   └── DATA_SOURCE_MATRIX.md
├── website_monitoring/
│   ├── MANIFEST.json
│   ├── README.md
│   ├── status.py
│   ├── connectors/monitor.py
│   ├── config/sites.json
│   ├── config/policies.json
│   ├── scheduler/monitor_schedule.json
│   ├── storage/observation_schema.json
│   ├── docs/ALERTS.md
│   ├── docs/LEGAL_OPERATION.md
│   └── tests/
├── .env.example
├── production/
│   ├── FINAL_MASTER_CHECKLIST.md
│   ├── FINAL_COMPLETION_MANIFEST.json
│   ├── status.py
│   ├── 01_architecture_integration/ … 13_go_live/
│   └── README.md
├── master_integration/
│   ├── MANIFEST.json
│   ├── README.md
│   ├── core.py
│   ├── status.py
│   ├── config/system.json
│   ├── docs/DEFINITION_OF_DONE.md
│   └── tests/test_master.py
├── final_integration/
│   ├── MANIFEST.json
│   ├── README.md
│   ├── FINAL_DEFINITION_OF_DONE.md
│   ├── status.py
│   ├── 01_integration/system_manifest.json
│   ├── 02_connectors/ … 10_runbooks/
│   └── 04_tests/
├── voice/
│   ├── server.py
│   └── web/index.html
└── archive/
    ├── Buzzard_Intelligence_v11_Voice_Interface.zip
    ├── Buzzard_Intelligence_v12_Shared_Memory.zip
    ├── Buzzard_Intelligence_v13_Multilingual.zip
    ├── Buzzard_Intelligence_v14_Competitor_Intelligence.zip
    ├── Buzzard_Intelligence_v15_Authenticity_Trust.zip
    ├── Buzzard_Intelligence_v16_Profitability.zip
    ├── Buzzard_Intelligence_v17_Market_Opportunity.zip
    ├── Buzzard_Intelligence_v18_Supplier_Intelligence.zip
    ├── Buzzard_Intelligence_v19_Risk_Compliance.zip
    ├── Buzzard_Intelligence_v20_Council_Orchestrator.zip
    ├── Buzzard_Intelligence_v21_AI_Agent_Gateway.zip
    ├── Buzzard_Intelligence_v22_Web_Research.zip
    ├── Buzzard_Intelligence_v23_Connector_Hub.zip
    ├── Buzzard_Intelligence_v24_Product_Matching.zip
    ├── Buzzard_Intelligence_v25_Price_Intelligence.zip
    ├── Buzzard_Intelligence_v26_Demand_Forecasting.zip
    ├── Buzzard_Intelligence_v27_Supplier_Matching.zip
    ├── Buzzard_Intelligence_v28_Product_Selection.zip
    ├── Buzzard_Intelligence_v29_Official_Verification.zip
    ├── Buzzard_DoguBey_AslanBey_v1.zip
    ├── Buzzard_AI_ALLES.zip
    ├── Buzzard_AI_GESAMT.zip
    ├── Buzzard_AI_DoguBey_tek_klasor.zip
    ├── Buzzard_AI_komplett.zip
    ├── Buzzard_Intelligence_v30_Autonomous_Mission.zip
    ├── Buzzard_Intelligence_v31_Learning_Memory.zip
    ├── Buzzard_Intelligence_v32_Category_Intelligence.zip
    ├── Buzzard_Intelligence_v33_Competitor_Intelligence.zip
    ├── Buzzard_Intelligence_v33_to_v40_COMPLETE.zip
    ├── Buzzard_Intelligence_v34_Alerts_Anomaly_Detection.zip
    ├── Buzzard_Intelligence_v35_Deep_Category_Taxonomy.zip
    ├── Buzzard_Intelligence_v36_Market_Geography.zip
    ├── Buzzard_Intelligence_v37_Risk_Compliance.zip
    ├── Buzzard_Intelligence_v38_Profitability_Scenario.zip
    ├── Buzzard_Intelligence_v39_Intelligence_Dashboard.zip
    ├── Buzzard_Intelligence_v40_Master_Intelligence_Core.zip
    ├── Buzzard_Intelligence_v41_v70_ALL_REMAINING.zip
    ├── Buzzard_Intelligence_v41_Authorized_Web_Research.zip
    ├── Buzzard_Intelligence_v42_Public_API_Data_Connectors.zip
    ├── Buzzard_Intelligence_v43_Data_Normalization_and_Deduplication.zip
    ├── Buzzard_Intelligence_v44_Source_Reliability_Scoring.zip
    ├── Buzzard_Intelligence_v45_Change_Detection.zip
    ├── Buzzard_Intelligence_v46_Competitor_Product_Tracking.zip
    ├── Buzzard_Intelligence_v47_Competitor_Category_Mapping.zip
    ├── Buzzard_Intelligence_v48_Competitor_Price_Tracking.zip
    ├── Buzzard_Intelligence_v49_Market_Trend_Radar.zip
    ├── Buzzard_Intelligence_v50_Opportunity_Discovery.zip
    ├── Buzzard_Intelligence_v51_Product_Trend_Radar.zip
    ├── Buzzard_Intelligence_v52_Brand_Intelligence.zip
    ├── Buzzard_Intelligence_v53_Supplier_Verification.zip
    ├── Buzzard_Intelligence_v54_Supplier_Performance_Tracking.zip
    ├── Buzzard_Intelligence_v55_Supplier_Price_Comparison.zip
    ├── Buzzard_Intelligence_v56_Stock_and_Availability_Intelligence.zip
    ├── Buzzard_Intelligence_v57_Shipping_and_Delivery_Intelligence.zip
    ├── Buzzard_Intelligence_v58_Marketplace_Intelligence.zip
    ├── Buzzard_Intelligence_v59_SEO_and_Search_Demand_Intelligence.zip
    ├── Buzzard_Intelligence_v60_Advertising_Intelligence.zip
    ├── Buzzard_Intelligence_v61_Customer_Review_Intelligence.zip
    ├── Buzzard_Intelligence_v62_Promotion_and_Discount_Intelligence.zip
    ├── Buzzard_Intelligence_v63_Seasonality_Intelligence.zip
    ├── Buzzard_Intelligence_v64_Cross-Border_Market_Intelligence.zip
    ├── Buzzard_Intelligence_v65_EU_and_Germany_Compliance_Monitor.zip
    ├── Buzzard_Intelligence_v66_Currency_and_FX_Intelligence.zip
    ├── Buzzard_Intelligence_v67_Landed_Cost_Calculator.zip
    ├── Buzzard_Intelligence_v68_Advanced_Profitability_Optimizer.zip
    ├── Buzzard_Intelligence_v69_Portfolio_and_Category_Portfolio_Manager.zip
    ├── Buzzard_Intelligence_v70_Real-Time_Intelligence_Command_Center.zip
    ├── Buzzard_Intelligence_v71_v100_COMPLETE.zip
    ├── Buzzard_Intelligence_v71_Automated_Research_Jobs.zip
    ├── Buzzard_Intelligence_v72_Data_Quality_Control.zip
    ├── Buzzard_Intelligence_v73_Multi_Agent_Collaboration.zip
    ├── Buzzard_Intelligence_v74_Hypothesis_Engine.zip
    ├── Buzzard_Intelligence_v75_Fact_Checking_Counter_Verification.zip
    ├── Buzzard_Intelligence_v76_Opportunity_Ranking.zip
    ├── Buzzard_Intelligence_v77_Product_Discovery.zip
    ├── Buzzard_Intelligence_v78_Supplier_Discovery.zip
    ├── Buzzard_Intelligence_v79_Market_Entry_Planner.zip
    ├── Buzzard_Intelligence_v80_Intelligence_Workflow_Automation.zip
    ├── Buzzard_Intelligence_v81_Dynamic_Price_Optimization.zip
    ├── Buzzard_Intelligence_v82_Dynamic_Margin_Intelligence.zip
    ├── Buzzard_Intelligence_v83_Advertising_ROAS_Intelligence.zip
    ├── Buzzard_Intelligence_v84_Inventory_Planning.zip
    ├── Buzzard_Intelligence_v85_Demand_to_Purchasing.zip
    ├── Buzzard_Intelligence_v86_Purchasing_to_Selling_Price.zip
    ├── Buzzard_Intelligence_v87_Cross_Sell_Intelligence.zip
    ├── Buzzard_Intelligence_v88_Bundle_Intelligence.zip
    ├── Buzzard_Intelligence_v89_Assortment_Optimization.zip
    ├── Buzzard_Intelligence_v90_Category_Portfolio_Intelligence.zip
    ├── Buzzard_Intelligence_v91_Germany_Market_Intelligence.zip
    ├── Buzzard_Intelligence_v92_EU_Market_Intelligence.zip
    ├── Buzzard_Intelligence_v93_T_rkiye_Market_Intelligence.zip
    ├── Buzzard_Intelligence_v94_Gulf_Market_Intelligence.zip
    ├── Buzzard_Intelligence_v95_International_Expansion_Intelligence.zip
    ├── Buzzard_Intelligence_v96_Global_Currency_Intelligence.zip
    ├── Buzzard_Intelligence_v97_Global_Customs_Intelligence.zip
    ├── Buzzard_Intelligence_v98_Global_Logistics_Intelligence.zip
    ├── Buzzard_Intelligence_v99_Local_Marketplace_Intelligence.zip
    ├── Buzzard_Intelligence_v100_Buzzard_AI_Intelligence_Center.zip
    ├── Buzzard_Intelligence_v101_v120_Error_Resilience_COMPLETE.zip
    ├── Buzzard_Intelligence_v101_Unified_Error_Handling.zip
    ├── Buzzard_Intelligence_v102_Input_Validation.zip
    ├── Buzzard_Intelligence_v103_Schema_Validation.zip
    ├── Buzzard_Intelligence_v104_API_Retry_Backoff.zip
    ├── Buzzard_Intelligence_v105_Rate_Limit_Manager.zip
    ├── Buzzard_Intelligence_v106_Timeout_Circuit_Breaker.zip
    ├── Buzzard_Intelligence_v107_Credential_Secret_Validation.zip
    ├── Buzzard_Intelligence_v108_Data_Integrity_Checks.zip
    ├── Buzzard_Intelligence_v109_Duplicate_Conflict_Resolution.zip
    ├── Buzzard_Intelligence_v110_Source_Freshness_Monitor.zip
    ├── Buzzard_Intelligence_v111_Data_Provenance_Lineage.zip
    ├── Buzzard_Intelligence_v112_Audit_Log_Integrity.zip
    ├── Buzzard_Intelligence_v113_Agent_Health_Monitor.zip
    ├── Buzzard_Intelligence_v114_Mission_Recovery_Manager.zip
    ├── Buzzard_Intelligence_v115_Queue_Job_Recovery.zip
    ├── Buzzard_Intelligence_v116_Human_Approval_Guardrails.zip
    ├── Buzzard_Intelligence_v117_Backup_Restore_Manager.zip
    ├── Buzzard_Intelligence_v118_System_Health_Dashboard.zip
    ├── Buzzard_Intelligence_v119_End_to_End_Integration_Tests.zip
    ├── Buzzard_Intelligence_v120_Production_Readiness_Error_Center.zip
    ├── Buzzard_Intelligence_v121_v200_ALL_REMAINING_COMPLETE.zip
    ├── Buzzard_Intelligence_v121 … v200 (80 einzelne ZIPs)
    ├── Buzzard_Intelligence_Marketplace_Website_Monitoring.zip
    ├── Buzzard_Intelligence_Marketplace_Website_Monitoring_UPDATED.zip
    ├── Buzzard_Intelligence_Live_Data_Connector_Pack.zip
    ├── Buzzard_Intelligence_FINAL_PRODUCTION_COMPLETION.zip
    ├── Buzzard_Intelligence_MASTER_INTEGRATION_COMPLETE.zip
    ├── Buzzard_Intelligence_FINAL_INTEGRATION_TEST_GO_LIVE.zip
    └── Buzzard_Intelligence_Live_Data_Connector_Pack.zip
```
