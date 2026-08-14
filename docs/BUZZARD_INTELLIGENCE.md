# Buzzard Intelligence v1–v15

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

Archive: `intelligence/archive/Buzzard_Intelligence_v*.zip`

## v15 Authenticity & Trust — neu

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
│   └── trust.py
├── voice/
│   ├── server.py
│   └── web/index.html
└── archive/
    ├── Buzzard_Intelligence_v11_Voice_Interface.zip
    ├── Buzzard_Intelligence_v12_Shared_Memory.zip
    ├── Buzzard_Intelligence_v13_Multilingual.zip
    ├── Buzzard_Intelligence_v14_Competitor_Intelligence.zip
    └── Buzzard_Intelligence_v15_Authenticity_Trust.zip
```
