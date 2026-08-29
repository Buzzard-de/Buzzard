# Restliche Production-Einrichtung

**Stand:** 29. Aug 2026 · Part 14 live · Katalogmodus

Alles, was nach dem Go-Live noch fehlt — automatisch (Repo/CI) und manuell (Dashboard/DNS).

---

## Automatisch (nach Merge + Blueprint-Sync)

| Item | Wo | Status nach Sync |
|------|-----|------------------|
| Render **Starter** Plan | `render.yaml` → `buzzard-api` | Persistent Disk möglich (~7 €/Monat) |
| Persistent Disk `/var/data` | `render.yaml` `disk:` | SQLite über Redeploys |
| `BUZZARD_DB_PATH` | `/var/data/buzzard.db` | `GET /api/health/db` → `persistent: true` |
| `BUZZARD_BACKUP_DIR` | `/var/data/backups` | Backups auf Disk |
| Redis-Platzhalter | `UPSTASH_*` sync:false | Credentials im Dashboard setzen |

### Script / CI

```bash
# Nur Audit (live prüfen)
node scripts/setup-production-remaining.mjs

# Mit Render API Key anwenden
RENDER_API_KEY=... node scripts/setup-production-remaining.mjs --apply
```

GitHub Actions → **Setup Production Remaining** → optional `apply_render: true` (benötigt `RENDER_API_KEY` Secret).

---

## Manuell — du musst einmal klicken

### 1. Render Blueprint sync

1. [Blueprint öffnen](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)
2. **Apply** — übernimmt Starter + Disk aus `main`
3. Warten bis Deploy grün (~5–10 Min.)
4. Prüfen:

```bash
curl -s https://buzzard-api.onrender.com/api/health/db | jq .database.persistence
```

Erwartung: `"persistent": true`, `"mode": "render_persistent_disk"`

### 2. Upstash Redis (Free Tier)

1. https://console.upstash.com/ → Database erstellen (Region EU wenn möglich)
2. **REST API** → URL + Token kopieren
3. Render → `buzzard-api` → Environment:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Save → Redeploy
5. Prüfen: `GET /api/security/health` → `rateLimit.backend: redis`

Alternativ: GitHub Secrets `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` und Workflow mit `apply_render: true`.

### 3. Admin-Passwort

1. Render → `buzzard-api` → **Environment** → `ADMIN_PASSWORD`
2. Generiertes Passwort anzeigen/kopieren oder neues setzen (min. 12 Zeichen)
3. Login: https://buzzard24.de/admin/login/  
   E-Mail: `admin@buzzard24.de`

Details: `docs/ADMIN_SETUP_DE.md`

### 4. Google Search Console

**Verifizierungsdatei ist bereits live:**

https://buzzard24.de/google1206d6d713142108.html

1. https://search.google.com/search-console
2. Property **URL-Präfix** `https://buzzard24.de` hinzufügen
3. Methode: **HTML-Datei** (bereits deployed)
4. Sitemap einreichen: `https://buzzard24.de/sitemap.xml`

Details: `docs/SEO_SEARCH_CONSOLE_DE.md`

### 5. Cloudflare (optional, empfohlen)

1. Account: https://dash.cloudflare.com (Free)
2. Site `buzzard24.de` hinzufügen
3. IONOS Nameserver auf Cloudflare umstellen
4. DNS: CNAME → GitHub Pages (orange Wolke)
5. SSL: **Full (strict)**

Details: `docs/CLOUDFLARE_SETUP_DE.md`

---

## Nach Persistent Disk — einmalig

Auf Render Shell oder lokal mit korrektem `BUZZARD_DB_PATH`:

```bash
npm run backup:db
node scripts/sync-search-index.mjs
```

---

## Bewusst nicht (Part 15 / Verkauf)

- `BUZZARD_SALES_ENABLED=1`
- Stripe/PayPal Live-Keys
- Echte Produktbilder
- Lieferantenbestellungen

---

## Checkliste

- [ ] Blueprint sync → Starter + Disk
- [ ] `/api/health/db` → persistent true
- [ ] Upstash Redis gesetzt
- [ ] Admin-Passwort notiert + Login getestet
- [ ] Search Console Property + Sitemap
- [ ] (Optional) Cloudflare DNS
- [ ] `npm run test:production-smoke` PASS
