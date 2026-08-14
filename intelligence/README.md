# Buzzard Intelligence v1–v14

Erweiterbares **Markt-/Produkt-Intelligence-MVP** (Python + SQLite), getrennt vom Node-Shop.

## Module

| Version | Modul | Zweck |
|---------|-------|-------|
| v1–v10 | … | Memory → Council |
| v11 | `voice/` | Sprach-UI (Browser Speech API + Flask) |
| v12 | `shared_memory.py` | Langfristige Shared Memory (Entscheidungen, Aufgaben, Konversationen) |
| v13 | `multilingual.py` | Mehrsprachige Begriffe und kanonische Entitäten |
| v14 | `competitor.py` | Legale Wettbewerbs-/Marktbeobachtungen aus öffentlichen Quellen |

## Setup

```bash
cd intelligence
pip install -r requirements.txt
python main.py init
python main.py voice
```

Browser: http://127.0.0.1:8787

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
