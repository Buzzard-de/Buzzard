# Buzzard24 — Was noch zu tun ist

**Stand:** 29. Aug 2026 · **Part 14 LIVE** · Deploy Hook aktiv · Katalogmodus ohne Verkauf

---

## ✅ Erledigt (Live)

| Bereich | Status |
|---------|--------|
| GitHub Pages (`buzzard24.de`) | ✅ Live |
| Render API (`buzzard-api`) | ✅ Live — Commit synced, `DEPLOYMENT_DRIFT=false` |
| Deploy Hook (`RENDER_DEPLOY_HOOK_URL`) | ✅ GitHub Actions → Render deploy |
| production-smoke | ✅ 15/15 |
| part12:live | ✅ 8/8 |
| Verify Go-Live / Deploy Buzzard API CI | ✅ SUCCESS |
| Verkauf | ✅ **AUS** (`BUZZARD_SALES_ENABLED=0`) |

**Closeout:** `docs/PART14_LIVE_CLOSEOUT_REPORT.md`

---

## 🟡 Optional (nicht blockierend)

1. **Persistent Disk** — Render Starter + `/var/data` + `BUZZARD_DB_PATH` (SQLite über Redeploys behalten)
2. **Upstash Redis** — verteiltes Rate-Limiting (aktuell: Memory)
3. **`buzzard-intelligence`** Docker-Deploy fixen (P1/Katalog unabhängig)
4. **Admin-Passwort** — Render → `buzzard-api` → Environment → `ADMIN_PASSWORD`
5. **Google Search Console** → `docs/SEO_SEARCH_CONSOLE_DE.md`
6. **Cloudflare** → `docs/CLOUDFLARE_SETUP_DE.md`

---

## ⛔ Bewusst nicht (ohne deine Freigabe)

- Echte Produktbilder
- Verkauf / Stripe / PayPal aktivieren
- Commerce-Secrets ins Repo
- Echte Lieferantenbestellungen
- **Part 15**

---

## Schnell-Check (Live)

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:part14
curl -s https://buzzard-api.onrender.com/api/health/version
curl -s https://buzzard-api.onrender.com/api/health/production
```

Erwartung: **version 200**, **drift false**, **sales false**.
