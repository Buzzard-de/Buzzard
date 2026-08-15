# Buzzard AI GESAMT — Unified Platform v2

Erweiterte **Gesamt-Architektur** mit Doğu Bey, Aslan Bey und Esat Bey auf gemeinsamer SQLite-Plattform (`buzzard.db`).

## v2 Erweiterungen

- **Versioned Memory** — `memory_history`, Versions-Tracking
- **Research** — `research_runs`, `source_observations`, Change Detection
- **Esat Bey** — `scan_text()` für defensive Content-Prüfung
- **AI Provider** — optionaler LLM-Adapter (nur via Env)
- **Security** — API-Token-Auth (`BUZZARD_API_TOKEN`)
- **Monitoring** — Health-Check Endpoint/CLI

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
| `health` | `gesamt-health` |
| `ai-status` | `gesamt-ai-status` |
| `task` | `gesamt-task` |
| `dispatch` | `gesamt-dispatch` |
| `pytest` | `gesamt-test` |
| — | `gesamt-status` |

```bash
cd intelligence
python3 main.py gesamt-init
python3 main.py gesamt-health
python3 main.py gesamt-ai-status
python3 main.py gesamt-test
```

## Konfiguration

Siehe `.env.example`: `BUZZARD_DB`, `BUZZARD_API_TOKEN`, `BUZZARD_LLM_*`, Fetch-Limits.

## Optional: FastAPI v2

```bash
cd intelligence
uvicorn buzzard_ai_gesamt.api.app:app --reload
```

Neue Endpoints: `/health`, `/dispatch`, `/security/scan` (Token via `X-Buzzard-Token` Header wenn gesetzt).

## Abgrenzung

- **v29 / Aslan v1** → `verify-*`, `dogubey-*`, `aslan-*` (separate DB)
- **GESAMT v2** → `gesamt-*` + `buzzard.db`

Archive: `archive/Buzzard_AI_NAECHSTER_GESAMTPAKET.zip`, `archive/Buzzard_AI_ALLES_AUF_EINMAL.zip`
