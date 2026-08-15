# Buzzard AI ALLES — Gesamtstand Doğu Bey + Aslan Bey

Portable **Standalone-Bundle** mit beiden Komponenten in einem Ordner:

| Komponente | Modul | Rolle |
|------------|-------|-------|
| **Doğu Bey** | `buzzard_intelligence/verify.py` | v29 Official Verification |
| **Aslan Bey** | `buzzard_intelligence/aslan.py` | Müsteşar-/Koordinationslayer v1 |

Gemeinsame SQLite-DB: `buzzard_official_verification_v29.db`

## Standalone (aus Archiv)

```bash
unzip Buzzard_AI_ALLES.zip
cd Buzzard_AI_ALLES
python main.py init
python main.py demo
python main.py report
python main.py claim --entity "..." --text "..."
python main.py source --claim-id 1 --type OFFICIAL_MANUFACTURER --url "..." --publisher "..."
python main.py verify --claim-id 1 --status VERIFIED --note "..."
python main.py aslan-task --title "..." --objective "..." --priority HIGH
python main.py aslan-dashboard
```

Siehe `PROJECT_CONTENTS.txt` im Archiv.

## Integrierte CLI (intelligence/)

| Standalone | Stack |
|------------|-------|
| `init` | `init-v29` (v29 + Aslan Tabellen) |
| `demo` | `verify-demo` |
| `report` | `verify-report` / `dogubey-report` |
| `claim` | `verify-claim` / `dogubey-claim` |
| `source` | `verify-source` / `dogubey-source` |
| `verify` | `verify-set` / `dogubey-verify` |
| `aslan-task` | `aslan-task` |
| `aslan-status` | `aslan-status` |
| `aslan-result` | `aslan-result` |
| `aslan-review` | `aslan-review` |
| `aslan-dashboard` | `aslan-dashboard` |

```bash
cd intelligence
python main.py init-v29
python main.py verify-demo
python main.py aslan-task --title "..." --objective "..." --priority HIGH
python main.py aslan-dashboard
```

## Hinweis

Im Stack sind die Module unter `buzzard_intelligence/` mit deutscher CLI und korrekten DB-Pfaden integriert. Das ALLES-ZIP ist der portable Entwicklungsstand (türkische Meldungen im Standalone-`main.py`).

Archive: `archive/Buzzard_AI_ALLES.zip`

Siehe auch: `dogubey/README.md`, `dogubey_aslan/README.md`
