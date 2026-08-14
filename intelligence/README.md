# Buzzard Intelligence v1–v29

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

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

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py voice
```

Browser: http://127.0.0.1:8787

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
