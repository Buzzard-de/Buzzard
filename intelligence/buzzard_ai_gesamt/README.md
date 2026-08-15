# Buzzard AI GESAMT — Unified Platform

Erweiterte **Gesamt-Architektur** mit Doğu Bey, Aslan Bey und Esat Bey als Agent-System
auf gemeinsamer SQLite-Plattform (`buzzard.db`).

## Agenten

| Agent | Rolle | Modul |
|-------|-------|-------|
| **Doğu Bey** | İstihbarat / Araştırma | `agents/dogu_bey/agent.py` |
| **Aslan Bey** | Müsteşar / Koordination | `agents/aslan_bey/agent.py` |
| **Esat Bey** | Siber Güvenlik (defensiv) | `agents/esat_bey/agent.py` |

## Stack-CLI (intelligence/)

| Standalone `main.py` | Stack |
|----------------------|-------|
| `init` | `gesamt-init` |
| `agents` | `gesamt-agents` |
| `report` | `gesamt-report` |
| `dashboard` | `gesamt-dashboard` |
| `task` | `gesamt-task` |
| `dispatch` | `gesamt-dispatch` |
| `pytest` | `gesamt-test` |
| — | `gesamt-status` |

```bash
cd intelligence
python main.py gesamt-init
python main.py gesamt-agents
python main.py gesamt-task --title "Test" --description "Research task"
python main.py gesamt-dashboard
python main.py gesamt-test
```

## Parallel: v29 / v1 Stack

| Funktion | CLI |
|----------|-----|
| Doğu Bey v29 | `verify-*`, `dogubey-*` |
| Aslan Bey v1 | `aslan-*` |

## Optional: FastAPI

```bash
cd intelligence
uvicorn buzzard_ai_gesamt.api.app:app --reload
```

## Abgrenzung

- **ALLES** = kompaktes Bundle (`Buzzard_AI_ALLES/`)
- **GESAMT v1** = Platzhalter-Struktur (Archiv)
- **GESAMT Platform** = ALLES_AUF_EINMAL Implementierung (dieses Paket)

Archive: `archive/Buzzard_AI_ALLES_AUF_EINMAL.zip`, `archive/Buzzard_AI_GESAMT.zip`

Siehe auch: `buzzard_ai_alles/README.md`, `dogubey_aslan/README.md`
