# Security & Backup (P0/P1-04, P1-15 Ergänzung)

**Stand:** 27. August 2026  
**Verkauf:** deaktiviert

---

## Bereits vorhanden (nicht neu bauen)

| Maßnahme | Ort |
|----------|-----|
| Admin-Auth | `server/lib/auth.js` |
| RBAC | `server/lib/rbac.js` |
| Rate Limiting | `server/lib/security.js` |
| CORS | `server/server.js` |
| Security Headers | `server/lib/security.js` |
| Audit Log | `server/lib/audit.js` |
| Import Validation | `server/lib/security.js`, `productValidator.js` |
| Idempotency (OMS) | `server/lib/orderManagement.js` |

---

## Secrets — niemals committen

- `ADMIN_PASSWORD` → Render `buzzard-api`
- `JWT_SECRET` / DB-Auth
- `GOOGLE_SITE_VERIFICATION`
- Supplier-API-Keys
- Stripe/PayPal (bewusst leer im Katalogmodus)

---

## Backup

| Daten | Speicherort | Backup |
|-------|-------------|--------|
| Produktkatalog | `data/buzzard_products.json` | Git |
| Übersetzungen | `data/buzzard_product_translations.json` | Git |
| SQLite (OMS/AI) | `server/data/buzzard.db` | Render Disk / manuell |
| Queues/Audit | `server/data/*.json` | Git optional / Disk |
| Website | GitHub Pages | Git `main` |

**Rollback:** Render → vorherige Deploy-Revision; JSON aus Git restore.

---

## Monitoring

- GitHub Action: `.github/workflows/uptime-monitor.yml`
- Smoke: `scripts/verify-go-live.mjs`, `scripts/p1-smoke.mjs`
- Siehe: `docs/MONITORING.md`
