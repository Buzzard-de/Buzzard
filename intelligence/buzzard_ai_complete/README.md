# Buzzard AI COMPLETE vNext — Consolidated Workspace

Final **Alles-in-einem-Ordner**-Paket mit Orchestrator, Policy Gate, Metrics und Integration-Adaptern.

## vNext Erweiterungen

- **BuzzardPolicy** — defensive action gate (`core/policies.py`)
- **RateLimiter** — API rate limiting
- **Metrics** — in-memory counters
- **Integration adapters** — LLM mock, notifications, search base
- **Task scheduler** — async scheduled tasks
- **Docker** — `docker-compose.yml`, `deploy/docker/Dockerfile`

## o2 Erweiterungen (NOCH_FEHLENDE_FEHLERBEREINIGT)

- **97 Scaffold-Ordner** — vollständiger Architektur-Baum (agents, api, deploy, docs, …)
- **complete-tree** — Architekturbaum anzeigen
- **complete-inventory** — Projekt-Inventar
- **complete-verify** — pytest + Import-Sweep (fehlerfrei verifiziert)

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
python3 main.py complete-tree
python3 main.py complete-inventory
python3 main.py complete-verify
python3 main.py complete-maintain --cleanup
python3 main.py complete-test
python3 main.py complete-status
```

## Dauerbetrieb (empfohlen für Produktion)

```bash
# Einmalig: Test-Tasks aufräumen
python3 main.py complete-maintain --cleanup

# API + Scheduler via Docker
docker compose -f buzzard_ai_complete/docker-compose.yml up -d

# Oder Scheduler lokal (alle 5 Min, 1 Task pro Zyklus)
python3 main.py complete-scheduler --interval 300 --process 1
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

Archive: `archive/Buzzard_AI_COMPLETE_VNEXT_ALLES_IN_EINEM_ORDNER.zip`, `archive/Buzzard_AI_NOCH_FEHLENDE_FEHLERBEREINIGT.zip` (o2), `archive/Buzzard_AI_o3_NOCH_FEHLENDE_FEHLERBEREINIGT.zip` (o3 = Duplikat von o2)
