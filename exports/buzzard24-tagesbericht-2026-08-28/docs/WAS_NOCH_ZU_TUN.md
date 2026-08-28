# Buzzard24 — Was noch zu tun ist

**Stand:** 28. Aug 2026 · Katalogmodus · Verkauf & Produktbilder bewusst aus

---

## ✅ Im Code erledigt (PR #239 + #240)

| Bereich | Status |
|---------|--------|
| P1 Katalog-Plattform (05–15) | Validator, Adapter, AI, Queue, Smoke |
| Wave 2 SEO/i18n/Security | Search-Console-Doku, Kontakt 4 Sprachen |
| AI Guardian MAX | Kostenkontrolle, Approvals, Incidents, Backup |
| Produkt-Übersetzungen | Script `npm run catalog:i18n-fill` |
| Render Blueprint | orchestrator + guardian + API-Verkettung vorbereitet |
| Monitoring | verify-go-live + Uptime alle 6h |

---

## 🔴 Nur du — nach PR-Merge

1. **PRs mergen:** [#239](https://github.com/Buzzard-de/Buzzard/pull/239) + [#240](https://github.com/Buzzard-de/Buzzard/pull/240)
2. **Render Blueprint Sync** → Services `buzzard-orchestrator`, `buzzard-guardian`
3. **Admin-Passwort notieren** — Render generiert `ADMIN_PASSWORD` automatisch (Service `buzzard-api` → Environment → Reveal)
4. **Optional:** GitHub Secrets `NEXT_PUBLIC_COMPANY_STREET`, `NEXT_PUBLIC_COMPANY_VAT_ID`
5. **Optional:** Google Search Console → `docs/GOOGLE_SEARCH_CONSOLE.md`
6. **Optional:** Cloudflare → `docs/CLOUDFLARE_SETUP_DE.md`

---

## ⛔ Bewusst nicht (ohne deine Freigabe)

- Echte Produktbilder
- Verkauf / Stripe / PayPal aktivieren
- Commerce-Secrets

---

## Schnell-Check nach Merge

```bash
npm run verify:go-live
npm run verify:p1
npm run verify:p1:seo
npm run guardian:self-test
curl https://buzzard-api.onrender.com/api/p1/status
curl https://buzzard-api.onrender.com/api/guardian/status
```

---

## Docs

| Thema | Datei |
|-------|--------|
| P1 Plattform | `docs/P1_CATALOG_PLATFORM_DE.md` |
| Guardian | `docs/GUARDIAN_DE.md` |
| Admin | `docs/ADMIN_SETUP_DE.md` |
| Orchestrator | `docs/ORCHESTRATOR_DE.md` |
| Search Console | `docs/GOOGLE_SEARCH_CONSOLE.md` |
