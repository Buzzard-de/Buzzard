# Render API einrichten — buzzard24.de

Die **Website** läuft schon auf GitHub Pages. Die **Render API** ist das Backend (Konto, Admin, Suche).  
**Verkauf bleibt aus** (`BUZZARD_SALES_ENABLED=0`).

## Was wird erstellt?

| Service | URL | Zweck |
|---------|-----|--------|
| `buzzard-api` | https://buzzard-api.onrender.com | Node-API + SQLite |
| `buzzard-intelligence` | (intern) | Python AI-Stack |

## Schritt 1 — Render mit GitHub verbinden

1. Einloggen oder registrieren: [dashboard.render.com](https://dashboard.render.com)
2. GitHub verbinden: [github.com/apps/render](https://github.com/apps/render) → **Install**
3. Repository **`Buzzard-de/Buzzard`** auswählen → Zugriff erlauben

## Schritt 2 — Blueprint starten (empfohlen)

1. Öffnen: **[Blueprint für Buzzard starten](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)**
2. Zwei Services werden angezeigt:
   - `buzzard-api` (Node)
   - `buzzard-intelligence` (Docker)
3. **Plan: Free** belassen (für den Start OK)
4. **Apply** / **Create** klicken
5. Warten: Deploy dauert **5–15 Minuten** (Free-Tier kann langsam starten)

Render erzeugt automatisch:
- `JWT_SECRET`
- `ADMIN_PASSWORD` (notieren — für Admin-Login!)

## Schritt 3 — Prüfen ob API live ist

Im Browser oder Terminal:

```
https://buzzard-api.onrender.com/api/health
```

**Erwartet:** JSON mit `"status":"ok"` oder ähnlich (nicht 404).

Oder im Render-Dashboard → `buzzard-api` → **Logs** → „Server listening“ / Health check grün.

## Schritt 4 — Admin-Zugang

Nach erfolgreichem Deploy:

1. Öffnen: **https://buzzard24.de/admin/login/**
2. Login-Daten aus Render:
   - Render Dashboard → `buzzard-api` → **Environment**
   - `ADMIN_EMAIL` (Standard: `admin@buzzard.de`)
   - `ADMIN_PASSWORD` (von Render generiert — einmal anzeigen/kopieren)

## Schritt 5 — Website neu verbinden (meist automatisch)

GitHub Pages nutzt bereits `https://buzzard-api.onrender.com` als API-URL.  
Nach dem ersten API-Deploy einmal prüfen:

- Startseite → kein API-Warnbanner mehr (falls vorher sichtbar)
- Optional: GitHub → Actions → **Deploy to GitHub Pages** → **Run workflow** (manuell neu bauen)

## Checkliste

- [ ] Render GitHub App installiert
- [ ] Blueprint angewendet (`buzzard-api` + `buzzard-intelligence`)
- [ ] `/api/health` → OK (kein 404)
- [ ] `ADMIN_PASSWORD` aus Render notiert
- [ ] Admin-Login getestet: `/admin/login/`

## Häufige Probleme

| Problem | Lösung |
|---------|--------|
| `no-server` / 404 | Blueprint noch nicht angewendet oder Deploy läuft noch |
| Deploy schlägt fehl | Render → Logs lesen; oft: Docker-Build `buzzard-intelligence` — `buzzard-api` kann trotzdem separat laufen |
| API langsam (30s+) | Free-Tier „Cold Start“ — normal nach Inaktivität |
| Admin-Login geht nicht | `ADMIN_PASSWORD` in Render Environment prüfen |

## Alternative — GitHub Actions (für Entwickler)

Falls Blueprint nicht klappt:

1. Render → Account Settings → **API Keys** → Key erstellen
2. GitHub → `Buzzard-de/Buzzard` → Settings → Secrets → `RENDER_API_KEY`
3. Actions → **Setup Render API** → Run workflow

*(Erstellt nur `buzzard-api`, nicht `buzzard-intelligence`.)*

## Wichtig

- **Kein Verkauf aktivieren** — `BUZZARD_SALES_ENABLED` bleibt `0`
- **Keine Stripe/PayPal Keys** nötig für Katalogmodus
- SQLite auf Free-Tier: Daten können bei Redeploy zurückgesetzt werden (für Demo/Katalog OK)
