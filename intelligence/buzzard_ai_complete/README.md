# Buzzard AI COMPLETE — Consolidated Workspace

Kompaktes **Alles-in-einem-Ordner**-Paket mit gemeinsamen Services für Doğu Bey, Aslan Bey und Esat Bey.

## Agenten

| Agent | Rolle |
|-------|-------|
| **Doğu Bey** | Intelligence & OSINT |
| **Aslan Bey** | Müsteşar / Orchestrator |
| **Esat Bey** | Defensive Security |

## Stack-CLI (intelligence/)

| Standalone | Stack |
|------------|-------|
| `python main.py` | `complete-init` |
| — | `complete-agents` |
| — | `complete-task` |
| — | `complete-tasks` |
| — | `complete-health` |
| — | `complete-scan` |
| `pytest` | `complete-test` |
| — | `complete-status` |

```bash
cd intelligence
python3 main.py complete-init
python3 main.py complete-agents
python3 main.py complete-task --title "Research" --description "Market scan"
python3 main.py complete-test
```

## Konfiguration

Siehe `.env.example`: `BUZZARD_COMPLETE_DB`, `BUZZARD_API_TOKEN`, `LLM_*`, `SEARCH_*`

## Optional: FastAPI

```bash
cd intelligence
uvicorn buzzard_ai_complete.api.app:app --reload
```

## Abgrenzung

- **COMPLETE** → `complete-*` + `buzzard_complete.db` (dieses Paket)
- **GESAMT v2** → `gesamt-*` + `buzzard.db`
- **v29/v1** → `verify-*`, `dogubey-*`, `aslan-*`

Archive: `archive/Buzzard_AI_COMPLETE_ALLES_IN_EINEM_ORDNER.zip`
