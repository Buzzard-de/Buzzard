# BUZZARD — PART 1 BERICHT
## CORE FOUNDATION — Analyse & Ist-Zustand

**Datum:** 29. August 2026  
**Basis:** Code-Stand `main` (vor Part 2)  
**Typ:** Analysebericht (Part 1 wurde analysiert, nicht vollständig neu implementiert)

---

## Zusammenfassung

Part 1 bildet die **Core Foundation** des Buzzard-Stacks: Next.js-Storefront (statischer Export), Node.js-API mit Plugin-Architektur (~55 Plugins), hybride Datenspeicherung (SQLite + JSON) und ein Admin-Panel mit **47 Routen**.

Die Plattform läuft produktiv im **Katalogmodus** (`BUZZARD_SALES_ENABLED=0`, `BUZZARD_P1_CATALOG=1`). Verkauf, echte Zahlungen und Lieferanten-Dispatch sind bewusst deaktiviert.

### Stärken Part 1

- Admin-Auth mit scrypt, Rate Limiting, Account-Lockout, Admin-2FA (TOTP)
- RBAC-Grundgerüst mit 4 Rollen
- 53-Kategorien-Taxonomie (Level 3)
- P1-Katalogplattform live
- Guardian + Orchestrator-Bridges erreichbar
- Identity Security v2.0 (SQLite/JWT)
- Production Guard PASS 13/0/0/0 (28.08.2026)

### Schwächen / Lücken (vor Part 2)

- Kein zentrales Control Center
- Kein CSRF-Schutz
- 3–4 parallele Auth-Systeme ohne Unified Facade
- RBAC nur in ~10 von ~55 Plugins durchgesetzt
- Keine Kategorie-Sichtbarkeit für Kunden
- Keine `core_*`-Tabellen für AI/Orchestrierung
- Keine formale Part-1-Dokumentation (`ARCHITECTURE.md`, etc.)

---

## Architektur

```
┌─────────────────────┐     HTTPS      ┌──────────────────────────┐
│  buzzard24.de       │ ──────────────▶│  Static Next.js (out/)   │
│  (GitHub Pages)     │                │  app/, components/, lib/ │
└─────────────────────┘                └──────────────────────────┘
         │ fetch /api/*
         ▼
┌─────────────────────┐                ┌──────────────────────────┐
│  buzzard-api        │◀── plugins ───▶│  server/plugins/*.js     │
│  server/server.js   │                │  (~55 Plugins)           │
│  Port 10000         │                └──────────────────────────┘
└─────────────────────┘
         │
    ┌────┴────┬──────────────┬─────────────────┐
    ▼         ▼              ▼                 ▼
 SQLite    JSON-Dateien   Python-Services   Docker
 buzzard.db  data/*.json  orchestrator,     intelligence
             server/data/  guardian
```

### Server-Kern (`server/server.js`)

- Minimaler HTTP-Router ohne Express
- Globaler API-Rate-Limiter: 180 Requests/Minute/IP
- CORS-Whitelist (`localhost`, `buzzard24.de`, `BUZZARD_CORS_ORIGINS`)
- Body-Limit: 256 KB
- Security Headers auf allen Responses
- Plugins alphabetisch geladen

### Render-Services (Frankfurt)

| Service | Runtime | Status |
|---------|---------|--------|
| `buzzard-api` | Node | ✅ Live |
| `buzzard-orchestrator` | Python/FastAPI | ✅ Live |
| `buzzard-guardian` | Python/FastAPI | ✅ Live |
| `buzzard-intelligence` | Docker | ⚠️ Deploy instabil |

---

## Auth / RBAC

### 1. Admin-Auth (`server/lib/auth.js`)

| Aspekt | Implementierung |
|--------|-----------------|
| Speicher | `server/data/admin-users.json` |
| Sessions | In-Memory + `admin-sessions.json`, TTL 8 h |
| Passwort | scrypt |
| Token | 64-Byte-Hex Bearer |
| Rate Limit | 8 Versuche / 15 Min |
| Lockout | 5 Fehlversuche → 30 Min |
| 2FA | TOTP optional |

**Seed-Rollen:**

| E-Mail | Rolle |
|--------|-------|
| admin@buzzard.de | administrator |
| catalog@buzzard.de | catalog_manager |
| orders@buzzard.de | order_manager |
| readonly@buzzard.de | read_only |

### 2. Kunden-Auth Legacy (`customerAuth.js`)

- JSON-basiert, TTL 7 Tage
- `/api/account/register`, `/login`, etc.

### 3. Identity Security v2.0 (`identitySecurity.js`)

- Aktiv bei `BUZZARD_IDENTITY_SECURITY=1` + `BUZZARD_DB_ENABLED=1`
- JWT Access (30 Min) + Refresh (30 Tage)
- Registrierung, E-Mail-Verifikation, 2FA, GDPR

### 4. DB-Plugin-Auth (`databasePlugin.js`)

- `/api/auth/register`, `/api/auth/login`
- SQLite `users`-Tabelle
- Bestellungen blockiert im Katalogmodus

### RBAC Part 1 (`server/lib/rbac.js`)

**4 Rollen:** administrator, catalog_manager, order_manager, read_only

**Durchsetzung:** Nur in wenigen Plugins (`adminCatalogPlugin`, `p1CatalogPlatformPlugin`, `adminAuthPlugin`, etc.)

**Fehlend vor Part 2:** `categories.*`, `ai.*`, `system.*`, `security.*`, `integrations.*`

---

## Admin-Panel

### Struktur

- **47 Seiten** unter `app/admin/`
- **8 Nav-Bereiche** in `lib/admin/nav.config.mjs`
- Schutz: `AdminGuard` (client-seitig) → Login-Redirect
- Keine serverseitige Nav-Filterung nach Rolle

### Nav-Gruppen

| Gruppe | Beispiele |
|--------|-----------|
| Übersicht | Dashboard, Analytics, Master Admin |
| Katalog | Products, Catalog, PIM, SEO |
| Commerce | Orders, Cart, Payments |
| Marketing | Marketing Center, Reviews |
| CRM & Support | CRM, Customer Support |
| Logistik | Logistics, WMS, Fulfillment |
| Lieferanten | Suppliers, Sync, Integrations |
| Plattform | Identity Security, AI Center, Security Dashboard |

**Fehlend vor Part 2:** `/admin/control-center/`

---

## Kategorien

- **Quelle:** `data/buzzard_categories.json`
- **53 Hauptkategorien**, Level 1–3
- **Service:** `lib/categories/service.ts`
- **Part-1-Verhalten:** Alle Kategorien für Kunden sichtbar

**Fehlend vor Part 2:**

- Keine Sichtbarkeit ACTIVE/HIDDEN/COMING_SOON/DRAFT
- Kein `/api/categories/visibility`
- Kein Admin-Toggle

---

## Sicherheit

### Vorhanden

| Maßnahme | Details |
|----------|---------|
| Rate Limiting | API 180/min, Login 8/15min |
| Security Headers | HSTS, X-Frame-Options, COOP, CORP |
| CORS | Origin-Whitelist |
| Passwort-Hashing | scrypt |
| Account Lockout | 5 Fehlversuche, 30 Min |
| Admin 2FA | TOTP |
| Audit Log | JSON, max 5000 Einträge |
| Security Events | Login-Failures, Rate-Limits |

### Nicht vorhanden

- **CSRF-Schutz** — nicht implementiert (Bearer-Token reduziert Risiko)
- Rate-Limit In-Memory — bei Restart/Multi-Instance nicht persistent

---

## Deployment & Katalogmodus

### Wichtige Env-Vars (`render.yaml`)

```
BUZZARD_P1_CATALOG=1
BUZZARD_SALES_ENABLED=0
BUZZARD_DB_ENABLED=1
BUZZARD_IDENTITY_SECURITY=1
BUZZARD_ORCHESTRATOR_URL=…
BUZZARD_GUARDIAN_URL=…
```

### Live-Status (28.08.2026)

| Bereich | Status |
|---------|--------|
| Storefront buzzard24.de | ✅ HTTP 200 |
| API buzzard-api.onrender.com | ✅ Live |
| P1 catalog_mode | ✅ true, 15 Produkte |
| Guardian + Orchestrator | ✅ reachable |
| Production Guard | ✅ PASS 13/0/0/0 |
| Verkauf / Stripe / PayPal | ❌ deaktiviert |

---

## Datenbank (`server/lib/db.js`)

- **Engine:** better-sqlite3
- **~174 CREATE TABLE**, **33 Migrationsfunktionen**
- Bereiche: E-Commerce, Lieferanten, Identity v2.0, Analytics, Modul-Demo-Records

**Fehlend vor Part 2:** Keine `core_*`-Tabellen

---

## Lücken vor Part 2 (Checkliste)

| # | Lücke |
|---|-------|
| 1 | Zentrales Control Center |
| 2 | AI Task Orchestration (Node-Layer) |
| 3 | Kategorie-Sichtbarkeit |
| 4 | Erweitertes RBAC (8 Rollen, ai/system/security) |
| 5 | `server/core/`-Modul |
| 6 | Unified Auth Facade |
| 7 | CSRF-Schutz |
| 8 | Formale Dokumentation |
| 9 | Background Job Scheduler |
| 10 | `/api/health/db`, `/api/health/ai` |
| 11 | Category Readiness Framework |
| 12 | RBAC-Konsistenz über alle Plugins |
| 13 | Vitest Unit-Tests |

---

## Empfehlungen für Part 3

1. Unified Auth Facade
2. RBAC in alle Admin-Plugins + Nav-Filterung
3. CSRF-Strategie dokumentieren/implementieren
4. `ARCHITECTURE.md`, `ADMIN.md`, `SECURITY.md` finalisieren
5. Background Job Scheduler an `core_background_jobs` koppeln
6. Rate-Limit-Persistenz (Redis/Upstash)
7. Kategorie-Readiness Admin-UI
8. Echte AI-Provider hinter Approval-Gates
9. Vitest-Suite für Core-Module
10. Verkaufsfreigabe erst nach Readiness + Guardian-Pre-Flight
11. SQLite-Persistenz auf Render (Paid Disk)
12. Intelligence-Service stabilisieren

---

*Ende Part-1-Bericht*
