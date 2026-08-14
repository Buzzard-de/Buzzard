# Buzzard Intelligence v1–v27

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

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

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
│   └── supplier_match.py
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
    └── Buzzard_Intelligence_v27_Supplier_Matching.zip
```
