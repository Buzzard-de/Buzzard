# Buzzard Session Checkpoint — 28. Aug 2026 (Abend)

**Stand:** P1 Katalog + AI Guardian + Production Guard **live**. Live Verification **PASS 13/0/0/0**. Katalogmodus aktiv, Verkauf aus.

**Weiter genau hier:** Nächste Session mit diesem Dokument + `exports/production-verification-live-2026-08-28.json` starten.

---

## Live-Status (Production)

| Bereich | Status |
|--------|--------|
| Storefront https://buzzard24.de | ✅ HTTP 200 |
| API https://buzzard-api.onrender.com | ✅ Live |
| P1 `/api/p1/status` | ✅ `catalog_mode=true`, 15 Produkte |
| Guardian `/api/guardian/status` | ✅ configured + reachable |
| Orchestrator `/api/orchestrator/status` | ✅ configured + reachable |
| Production Guard Live | ✅ **PASS** (13 PASS, 0 WARN, 0 FAIL, 0 BLOCKED) |
| Verkauf / Checkout | ❌ `BUZZARD_SALES_ENABLED=0` (bewusst) |
| Stripe / PayPal | ❌ nicht aktiv (`sync: false`) |

---

## Gemergte PRs (heute Abend)

| PR | Inhalt | Merge |
|----|--------|-------|
| [#240](https://github.com/Buzzard-de/Buzzard/pull/240) | P1 Katalog, Guardian, Production Guard, Wave 2 SEO/i18n | ✅ `fe9d513` |
| [#241](https://github.com/Buzzard-de/Buzzard/pull/241) | `RENDER_EXTERNAL_HOSTNAME` für Service-URLs | ✅ `92c41e3` |
| [#242](https://github.com/Buzzard-de/Buzzard/pull/242) | Orchestrator + Guardian: Docker → Python-Runtime | ✅ `e77961e` |

**Aktueller `main`-HEAD:** `e77961e`

---

## Render Services (Frankfurt, Free)

| Service | Runtime | URL | Deploy |
|---------|---------|-----|--------|
| `buzzard-api` | Node | https://buzzard-api.onrender.com | ✅ success |
| `buzzard-orchestrator` | Python | https://buzzard-orchestrator.onrender.com | ✅ success |
| `buzzard-guardian` | Python | https://buzzard-guardian.onrender.com | ✅ success |
| `buzzard-intelligence` | Docker | https://buzzard-intelligence.onrender.com | ⚠️ Deploy weiterhin failure (nicht für P1-PASS nötig) |

### Env-Vars `buzzard-api` (Katalogmodus)

```
BUZZARD_P1_CATALOG=1
BUZZARD_SALES_ENABLED=0
BUZZARD_ORCHESTRATOR_URL=https://buzzard-orchestrator.onrender.com  (via RENDER_EXTERNAL_HOSTNAME)
BUZZARD_GUARDIAN_URL=https://buzzard-guardian.onrender.com            (via RENDER_EXTERNAL_HOSTNAME)
```

---

## Deployment-Lektion (wichtig für Fortsetzung)

1. **Docker** für orchestrator/guardian → Crash-Loop (~6 s failure). **Fix:** Python-Runtime in `render.yaml` mit `uvicorn … --port $PORT`.
2. **`fromService property: host`** lieferte internen Host (`buzzard-orchestrator`). **Fix:** `envVarKey: RENDER_EXTERNAL_HOSTNAME`.
3. Blueprint Sync läuft automatisch bei Push auf `main` (Render GitHub App).

---

## Wichtige Befehle

```bash
# Live Production Verification (Ziel: PASS)
npm run production:verify:live

# Lokal (API auf :3001)
npm run production:verify

# Guardian Self-Test
npm run guardian:self-test

# P1 Smoke (8 Checks)
node scripts/p1-smoke.mjs

# Go-Live Check
node scripts/verify-go-live.mjs
```

### Live-Health curls

```bash
curl -s https://buzzard-api.onrender.com/api/p1/status | jq .
curl -s https://buzzard-api.onrender.com/api/guardian/status | jq .
curl -s https://buzzard-api.onrender.com/api/orchestrator/status | jq .
curl -s https://buzzard-orchestrator.onrender.com/health
curl -s https://buzzard-guardian.onrender.com/health
```

---

## Kern-Dateien (nicht löschen)

| Pfad | Zweck |
|------|-------|
| `intelligence/buzzard_final_production_guard_max.py` | Fail-closed Production Verification Layer |
| `intelligence/buzzard_ai_guardian_max.py` | AI Guardian MAX |
| `intelligence/buzzard_guardian_api.py` | Guardian FastAPI |
| `intelligence/buzzard_orchestrator.py` | Orchestrator FastAPI |
| `scripts/run-production-guard.mjs` | NPM-Wrapper für Guard |
| `server/lib/p1CatalogPlatform.js` | P1 Katalog-Engine |
| `server/plugins/p1CatalogPlatformPlugin.js` | `/api/p1/*` |
| `server/lib/guardianBridge.js` | Guardian-Bridge |
| `server/lib/orchestratorBridge.js` | Orchestrator-Bridge |
| `render.yaml` | Render Blueprint (4 Services) |
| `exports/production-verification-live-2026-08-28.json` | Letzter PASS-Report |

---

## Exports / Berichte

| Ordner / Datei | Inhalt |
|----------------|--------|
| `exports/buzzard24-tagesbericht-2026-08-28/` | Vollständiger Tagesbericht |
| `exports/buzzard24-bericht-auswahl-2026-08-28/` | Auswahl 03, 05, 06, 07 |
| `exports/buzzard24-p1-catalog-platform-2026-08-27/` | P1 Paket |
| `exports/production-verification-live-2026-08-28.json` | Live PASS Report |
| `exports/production-verification-local-2026-08-28.json` | Lokal WARN Report |

---

## ⛔ Bewusst nicht aktiv (Hard Constraints)

- `BUZZARD_SALES_ENABLED=0` — bleibt
- Kein Stripe / PayPal
- Keine echten Lieferantenbestellungen
- Keine echten Produktbilder
- Keine Commerce-Secrets im Repo

---

## Nächste sinnvolle Schritte (wenn du weitermachst)

1. **Optional:** `buzzard-intelligence` Docker-Deploy fixen (aktuell failure, nicht blockierend)
2. **Optional:** Google Search Console → `docs/SEO_SEARCH_CONSOLE_DE.md`
3. **Optional:** GitHub Secrets für Impressum (USt-ID, Adresse)
4. **Optional:** `ADMIN_PASSWORD` aus Render notieren → Admin-Login testen
5. **Später (nur mit Freigabe):** Verkauf, Zahlung, echte Bilder

---

## Git

- **Branch:** `main` @ `e77961e`
- **Feature-Branches (historisch):** `cursor/ai-guardian-max-c293`, `cursor/render-deploy-fix-c293`, `cursor/render-python-runtime-c293` (alle gemerged)

---

## Nützliche URLs

- Repo: https://github.com/Buzzard-de/Buzzard
- Render Dashboard: https://dashboard.render.com
- Website: https://buzzard24.de
- API Health: https://buzzard-api.onrender.com/api/health
