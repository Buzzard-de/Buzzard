# Buzzard24 — Was noch zu tun ist

**Stand:** 27. Aug 2026 · Katalogmodus · Verkauf bleibt aus

---

## ✅ Im Code vorbereitet (nach Merge + Deploy)

| Bereich | Status |
|---------|--------|
| Website Katalog-Polish | PR — Demo-Texte weg, Rechtliches, Newsletter |
| AI Orchestrator | `intelligence/buzzard_orchestrator.py` + Render-Service |
| API-Bridge | `/api/orchestrator/status` |
| Monitoring | Uptime-Workflow alle 6h + verify-go-live |
| Docs | Admin, Cloudflare, Monitoring, Orchestrator |
| Verkauf | **Aus** (`SALES_ENABLED=0`) |
| Produktbilder | **Bewusst offen** |

---

## 🔴 Nur du — einmalig nach Merge

### 1. PR mergen & warten auf Deploy

- GitHub Pages (Website) — ca. 2–5 Min. nach Push auf `main`
- Render Blueprint — ggf. **Sync Blueprint** für neuen Service `buzzard-orchestrator`

### 2. Admin-Passwort

→ **`docs/ADMIN_SETUP_DE.md`**

Render → `buzzard-api` → `ADMIN_PASSWORD` → Login testen

### 3. Impressum (empfohlen)

GitHub Secrets für GitHub Pages:

| Secret | Beispiel |
|--------|----------|
| `NEXT_PUBLIC_COMPANY_STREET` | Ihre Straße + Hausnummer |
| `NEXT_PUBLIC_COMPANY_VAT_ID` | DE… (falls vorhanden) |

Ohne Secrets: PLZ 35232 Dautphetal.

### 4. Google Search Console (optional)

`docs/GOOGLE_SEARCH_CONSOLE.md` — Secret `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

### 5. Cloudflare (optional)

`docs/CLOUDFLARE_SETUP_DE.md`

---

## ⛔ Bewusst nicht jetzt

- Echte Produktbilder
- Verkauf / Stripe / PayPal / SMTP
- Commerce-Secrets AI Core Phase 3

---

## Schnell-Checkliste

```
[ ] PR gemergt
[ ] GitHub Pages deployed (kein „Demo-Katalog“ mehr auf Startseite)
[ ] Render: buzzard-api + buzzard-orchestrator Live
[ ] ADMIN_PASSWORD gesetzt + Admin-Login OK
[ ] npm run verify:go-live → grün
[ ] Optional: Straße/USt-ID, Search Console, Cloudflare
```

## Nützliche Befehle

```bash
npm run verify:go-live
npm run render:preflight
npm run orchestrator:dev    # Orchestrator lokal :8010
curl https://buzzard-api.onrender.com/api/orchestrator/status
```

## Docs

| Thema | Datei |
|-------|--------|
| Admin | `docs/ADMIN_SETUP_DE.md` |
| Orchestrator | `docs/ORCHESTRATOR_DE.md` |
| Cloudflare | `docs/CLOUDFLARE_SETUP_DE.md` |
| Monitoring | `docs/MONITORING.md` |
| Go-Live | `docs/GO_LIVE_PREP.md` |
