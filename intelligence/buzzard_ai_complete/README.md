# Buzzard AI COMPLETE vNext — Consolidated Workspace

Final **Alles-in-einem-Ordner**-Paket mit Orchestrator, Policy Gate, Metrics und Integration-Adaptern.

## vNext Erweiterungen

- **BuzzardPolicy** — defensive action gate (`core/policies.py`)
- **RateLimiter** — API rate limiting
- **Metrics** — in-memory counters
- **Integration adapters** — LLM mock, notifications, search base
- **Task scheduler** — async scheduled tasks
- **Docker** — `docker-compose.yml`, `deploy/docker/Dockerfile`

## Agenten

| Agent | Rolle |
|-------|-------|
| **Doğu Bey** | Intelligence & OSINT |
| **Aslan Bey** | Orchestrator |
| **Esat Bey** | Defensive Security |

## Stack-CLI (intelligence/)

```bash
cd intelligence
python3 main.py complete-init
python3 main.py complete-policy --action public_research
python3 main.py complete-metrics
python3 main.py complete-orchestrate --task-id "T-001" --objective "Research plan"
python3 main.py complete-test
python3 main.py complete-status
```

## Optional: FastAPI + Docker

```bash
cd intelligence
uvicorn buzzard_ai_complete.api.app:app --reload
# or
docker compose -f buzzard_ai_complete/docker-compose.yml up
```

## Abgrenzung

| Stack | CLI | DB |
|-------|-----|-----|
| **COMPLETE vNext** | `complete-*` | `buzzard_complete.db` |
| **GESAMT v2** | `gesamt-*` | `buzzard.db` |
| **v29/v1** | `verify-*`, `aslan-*` | v29 DB |

Archive: `archive/Buzzard_AI_COMPLETE_VNEXT_ALLES_IN_EINEM_ORDNER.zip`
