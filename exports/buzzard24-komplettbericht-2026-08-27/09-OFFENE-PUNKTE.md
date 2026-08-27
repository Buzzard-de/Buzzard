# 09 — Offene Punkte (Checkliste)

## 🔴 Pflicht — nach PR #238 Merge

- [ ] **PR #238 mergen** auf GitHub
- [ ] Warten auf GitHub Pages Deploy (2–5 Min.)
- [ ] Render → **Blueprint Sync** (für `buzzard-orchestrator`)
- [ ] Render → `buzzard-api` → **`ADMIN_PASSWORD`** setzen
- [ ] Admin-Login testen: https://buzzard24.de/admin/login/
- [ ] `npm run verify:go-live` → alles grün

## 🟡 Empfohlen

- [ ] GitHub Secret `NEXT_PUBLIC_COMPANY_STREET` (volle Adresse)
- [ ] GitHub Secret `NEXT_PUBLIC_COMPANY_VAT_ID` (falls vorhanden)
- [ ] GitHub Pages neu deployen (automatisch nach Secret + Push)
- [ ] Admin **2FA** aktivieren (`/admin/security-dashboard/`)
- [ ] Orchestrator prüfen: `curl …/api/orchestrator/status`

## 🟢 Optional

- [ ] Google Search Console (`docs/GOOGLE_SEARCH_CONSOLE.md`)
- [ ] Cloudflare (`docs/CLOUDFLARE_SETUP_DE.md`)
- [ ] GitHub-Account E-Mail → info@buzzard24.de
- [ ] UptimeRobot oder ähnlich für externe Alerts

## ⛔ Bewusst nicht jetzt

- [ ] Verkauf aktivieren (`SALES_ENABLED=1`)
- [ ] Stripe / PayPal Keys
- [ ] SMTP für Bestell-E-Mails
- [ ] Echte Produktbilder
- [ ] PIM / TecDoc Import
- [ ] Commerce-Secrets AI Core Phase 3
- [ ] Render Persistent Disk

## PR-Übersicht

| PR | Branch | Inhalt | Status |
|----|--------|--------|--------|
| #238 | cursor/website-catalog-complete-c293 | Website + Orchestrator + Ops | Offen |
| #237 | cursor/naechste-schritte-checkliste-c293 | Docs only | Offen (in #238 enthalten) |

## Zeitschätzung für dich

| Aufgabe | Dauer |
|---------|-------|
| PR mergen + warten | 5 Min. |
| Admin-Passwort | 2 Min. |
| Impressum Secrets | 5 Min. |
| Search Console | 15 Min. |
| Cloudflare | 30 Min. |
