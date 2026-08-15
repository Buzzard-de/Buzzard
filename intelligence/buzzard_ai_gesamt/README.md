# Buzzard AI GESAMT — Ziel-Projektstruktur

Erweiterte **Gesamt-Architektur** mit Agent-Ordnern und Platzhaltern für zukünftige Module (Esat Bey, Memory, API, …).

## Implementiert (Stack)

| Agent / Modul | Standalone-Pfad | Stack |
|---------------|-----------------|-------|
| **Doğu Bey** | `agents/dogu_bey/verify.py` | `buzzard_intelligence/verify.py` |
| **Aslan Bey** | `agents/aslan_bey/aslan.py` | `buzzard_intelligence/aslan.py` |
| **Esat Bey** | `agents/esat_bey/` (Platzhalter) | noch nicht implementiert |

## Platzhalter-Ordner (ZIP)

`api/`, `config/`, `core/`, `database/`, `logs/`, `memory/`, `reports/`, `research/`, `scripts/`, `security/`, `sources/`, `tasks/`, `tests/`

Siehe `docs/STATUS_AND_ROADMAP.md`.

## Integrierte CLI (intelligence/)

| Standalone `main.py` | Stack |
|----------------------|-------|
| `init` | `init-v29` |
| `demo` / `report` / `claim` / `source` / `verify` | `verify-*` / `dogubey-*` |
| `aslan-*` | `aslan-*` |
| — | `gesamt-status` (Roadmap & Status) |

```bash
cd intelligence
python main.py init-v29
python main.py gesamt-status
python main.py aslan-dashboard
```

## Abgrenzung

- **ALLES** = kompaktes Bundle (`Buzzard_AI_ALLES/`)
- **GESAMT** = erweiterte Zielstruktur mit Platzhaltern (`Buzzard_AI_GESAMT/`)

Archive: `archive/Buzzard_AI_GESAMT.zip`

Siehe auch: `buzzard_ai_alles/README.md`, `dogubey_aslan/README.md`
