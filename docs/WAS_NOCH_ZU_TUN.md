# Buzzard24 — Was noch zu tun ist

**Stand:** 29. Aug 2026 · **Part 14 LIVE** · Intelligence LIVE · Katalogmodus ohne Verkauf

**Einrichtungs-Guide:** `docs/SETUP_REMAINING_DE.md`

---

## ✅ Erledigt (Live)

| Bereich | Status |
|---------|--------|
| GitHub Pages (`buzzard24.de`) | ✅ Live |
| Render API (`buzzard-api`) | ✅ Live — Commit synced |
| Intelligence Python-Stack | ✅ Live — Bridge **LIVE** |
| Orchestrator + Guardian | ✅ Erreichbar |
| Deploy Hook | ✅ GitHub Actions → Render |
| production-smoke | ✅ 15/15 |
| Google-Verifizierungsdatei | ✅ Live unter `/google1206d6d713142108.html` |
| Verkauf | ✅ **AUS** (`BUZZARD_SALES_ENABLED=0`) |

---

## 🔧 Noch einrichten (Blueprint + Dashboard)

Repo ist vorbereitet (`render.yaml` Starter + Disk). **Einmal im Render Dashboard:**

1. **Blueprint sync** → Starter + Persistent Disk `/var/data`  
   → `BUZZARD_DB_PATH=/var/data/buzzard.db`  
   → Prüfen: `GET /api/health/db` → `persistent: true`

2. **Upstash Redis** (Free) → Render Env `UPSTASH_REDIS_REST_URL` + `TOKEN`

3. **Admin-Passwort** notieren → Render → `ADMIN_PASSWORD` → Login testen

4. **Google Search Console** → Property anlegen + Sitemap (Datei schon live)

5. **Cloudflare** (optional) → `docs/CLOUDFLARE_SETUP_DE.md`

```bash
node scripts/setup-production-remaining.mjs          # Audit
RENDER_API_KEY=... node scripts/setup-production-remaining.mjs --apply
```

GitHub Actions → **Setup Production Remaining**

---

## ⛔ Bewusst nicht (ohne deine Freigabe)

- Echte Produktbilder
- Verkauf / Stripe / PayPal aktivieren
- Commerce-Secrets ins Repo
- Echte Lieferantenbestellungen

**Part 15 Readiness:** `docs/PART15_READINESS_DE.md` · `npm run test:part15` · `npm run finish:production`

---

## Schnell-Check

```bash
BUZZARD_API_URL=https://buzzard-api.onrender.com npm run test:production-smoke
curl -s https://buzzard-api.onrender.com/api/health/db | jq .database.persistence
curl -s https://buzzard-api.onrender.com/api/intelligence/status | jq .bridge
```

Erwartung nach Disk-Setup: **persistent true**, **bridge LIVE**, **sales false**.
