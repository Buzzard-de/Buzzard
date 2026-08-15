# Buzzard AI GESAMT – Status & Roadmap

## Implementiert (NAECHSTER_GESAMTPAKET v2)

- `database/db.py` — erweitertes Schema: memory_history, research_runs, source_observations, api_keys
- `memory/store.py` — versioniertes Memory mit History
- `research/engine.py` — Content-Hash, Change Detection, research_runs
- `agents/esat_bey/agent.py` — `scan_text()` defensive Content-Prüfung
- `agents/aslan_bey/agent.py` — `decompose()` für Sub-Tasks
- `ai/provider.py` — optionaler LLM-Adapter (env-basiert)
- `security/auth.py` — API-Token-Autorisierung
- `monitoring/health.py` — DB + Version Health-Check
- `api/app.py` — FastAPI v2 mit Auth, dispatch, security/scan
- `tests/test_v2.py` — Memory-Versioning, Security-Scan Tests

## Platzhalter-Module (v2 Scaffold)

- `schemas/`, `storage/`, `cli/`, `web/`, `integrations/`, `migrations/`

## Parallel im Buzzard Intelligence Stack

- Doğu Bey v29 → `buzzard_intelligence/verify.py` (`verify-*`, `dogubey-*`)
- Aslan Bey v1 → `buzzard_intelligence/aslan.py` (`aslan-*`)

## Geplant

- Vollständige Schema-Migrationen
- Web-UI Dashboard
- Externe Integrationen (authorized connectors)
- Production Hardening (Rate Limits, Secrets Rotation)

## Wichtig

GESAMT v2 nutzt `buzzard.db`. v29 nutzt `buzzard_official_verification_v29.db`. Beide koexistieren getrennt.
