# Buzzard Intelligence v1–v17

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

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py voice
```

Browser: http://127.0.0.1:8787

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
