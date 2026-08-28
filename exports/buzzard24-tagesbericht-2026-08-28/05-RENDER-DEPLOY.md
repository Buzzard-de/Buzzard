# 05 — Render & Deploy-Vorbereitung

---

## Services in `render.yaml`

| Service | Status Code | Nach Merge |
|---------|-------------|------------|
| `buzzard-api` | ✅ live | Auto-Deploy + neue Env-Vars |
| `buzzard-orchestrator` | 🟡 Code OK | **Blueprint Sync nötig** |
| `buzzard-guardian` | 🟡 neu | **Blueprint Sync nötig** |
| `buzzard-intelligence` | ✅ | unverändert |

## Neue Env-Vars (buzzard-api)

| Variable | Quelle |
|----------|--------|
| `BUZZARD_ORCHESTRATOR_URL` | fromService buzzard-orchestrator |
| `BUZZARD_GUARDIAN_URL` | fromService buzzard-guardian |
| `BUZZARD_P1_CATALOG` | `1` |
| `BUZZARD_SALES_ENABLED` | `0` (bleibt!) |

## Guardian Service Env

```
BUZZARD_GUARDIAN_DB=/tmp/buzzard_guardian.sqlite3
BUZZARD_SALES_ENABLED=0
PORT=8001
```

## Deine Schritte

1. PR #240 mergen
2. Render Dashboard → Blueprint → **Sync**
3. Warten auf Deploy (~5–10 Min.)
4. Health prüfen:
   ```bash
   curl https://buzzard-api.onrender.com/api/p1/status
   curl https://buzzard-api.onrender.com/api/guardian/status
   curl https://buzzard-api.onrender.com/api/orchestrator/status
   ```
