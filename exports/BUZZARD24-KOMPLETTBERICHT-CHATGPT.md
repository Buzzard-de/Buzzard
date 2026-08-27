# BUZZARD24 KOMPLETTBERICHT — ALLES IN EINER DATEI
# Stand: 27. August 2026 | PR #238 gemergt auf main


================================================================================
DATEI: README.md
================================================================================

# Buzzard24 — Komplettbericht

**Erstellt:** 27. August 2026  
**Modus:** Katalog (kein Verkauf)  
**Repository:** https://github.com/Buzzard-de/Buzzard  
**Live-Website:** https://buzzard24.de

---

## Inhalt dieses Ordners

| Datei | Inhalt |
|-------|--------|
| [00-ZUSAMMENFASSUNG.md](./00-ZUSAMMENFASSUNG.md) | Executive Summary — Status auf einen Blick |
| [01-WEBSITE.md](./01-WEBSITE.md) | Frontend, Seiten, Katalog, Deploy |
| [02-API-BACKEND.md](./02-API-BACKEND.md) | Render API, Datenbank, Module |
| [03-EMAIL-KONTAKT.md](./03-EMAIL-KONTAKT.md) | IONOS, FormSubmit, Telefon |
| [04-RECHTLICHES.md](./04-RECHTLICHES.md) | Impressum, DSGVO, AGB, offene Punkte |
| [05-AI-ORCHESTRATOR.md](./05-AI-ORCHESTRATOR.md) | Task-Orchestrator, Agenten |
| [06-INTELLIGENCE-STACK.md](./06-INTELLIGENCE-STACK.md) | Python-Stack, Bridge, Embedded |
| [07-MONITORING-OPS.md](./07-MONITORING-OPS.md) | CI, Uptime, Backup, Cloudflare |
| [08-ARCHITEKTUR.md](./08-ARCHITEKTUR.md) | Systemdiagramm, Services, Env-Vars |
| [09-OFFENE-PUNKTE.md](./09-OFFENE-PUNKTE.md) | Checkliste — nur du |
| [10-BEFEHLE-LINKS.md](./10-BEFEHLE-LINKS.md) | Alle URLs und Terminal-Befehle |
| [LIVE-SNAPSHOT.json](./LIVE-SNAPSHOT.json) | Live-Health-Check vom Erstellungszeitpunkt |
| [MANIFEST.json](./MANIFEST.json) | Metadaten dieses Berichts |

---

## Wichtigster nächster Schritt

**PR #238 mergen** → dann Admin-Passwort in Render setzen.

Details: [09-OFFENE-PUNKTE.md](./09-OFFENE-PUNKTE.md)

---

## ZIP-Archiv

Dieser Ordner liegt auch als ZIP im Repo:

`exports/buzzard24-komplettbericht-2026-08-27.zip`


================================================================================
DATEI: 00-ZUSAMMENFASSUNG.md
================================================================================

# Executive Summary — Buzzard24

**Stand:** 27. August 2026, 20:33 UTC

## Gesamtstatus: 🟡 Katalogmodus funktionsfähig — Final-Polish wartet auf Merge

Buzzard24 ist als **Online-Katalog** live. Kontakt, Navigation, API und Admin-Infrastruktur laufen. Der **Verkauf ist bewusst deaktiviert**. Ein umfangreiches Update (PR #238) wartet auf Merge — danach sind Texte, Rechtliches, Newsletter und Orchestrator deployt.

---

## Ampel-Übersicht

| Bereich | Status | Kurz |
|---------|--------|------|
| Website buzzard24.de | 🟢 Live | GitHub Pages, HTTPS |
| E-Mail info@buzzard24.de | 🟢 Aktiv | IONOS + FormSubmit |
| Telefon | 🟢 Auf Website | +49 151 26219394 |
| Kontaktformular | 🟢 Aktiv | FormSubmit → IONOS |
| Render API | 🟢 Live | salesEnabled: **false** |
| Admin-Login | 🟡 Passwort nötig | ADMIN_PASSWORD in Render |
| Website-Texte (live) | 🟡 Noch „Demo“ | PR #238 behebt das |
| Newsletter (live) | 🟡 Fake lokal | PR #238 → FormSubmit |
| AI Orchestrator | 🟡 Im PR | Noch nicht auf main |
| Verkauf / Checkout | ⛔ Aus | Bewusst |
| Produktbilder | ⛔ Platzhalter | Bewusst offen |
| Google Search Console | ⚪ Optional | Noch nicht eingerichtet |
| Cloudflare | ⚪ Optional | Noch nicht eingerichtet |

---

## Zahlen (Live-Snapshot)

| Metrik | Wert |
|--------|------|
| Hauptkategorien | 53 |
| Demo-Produkte in API-DB | 26 |
| Bestellungen | 0 |
| API-User | 1 (Admin) |
| Git main HEAD | `ec4a21a` (PR #236) |
| Offener PR | #238 (Website + Orchestrator + Ops) |

---

## Was funktioniert heute

- Vollständige Website-Navigation (53 Kategorien, Produkte, Mehrsprachigkeit DE/EN/TR/AR)
- Kontakt per E-Mail, Telefon, Formular
- API Health OK, Intelligence Bridge (embedded)
- Katalogmodus blockiert Bestellungen korrekt
- Rechtliche Grundseiten erreichbar
- CI/CD: GitHub Actions Build + Deploy

---

## Was du noch machen musst (ca. 20 Min.)

1. **PR #238 mergen** auf GitHub
2. **Render Blueprint sync** (neuer Service `buzzard-orchestrator`)
3. **`ADMIN_PASSWORD`** in Render setzen → Admin-Login testen
4. Optional: Straße + USt-ID in GitHub Secrets
5. Optional: Google Search Console, Cloudflare

---

## Bewusst nicht jetzt

- Online-Verkauf (`SALES_ENABLED=1`)
- Stripe / PayPal / SMTP
- Echte Produktbilder & PIM-Import
- Commerce-Secrets für AI Core Phase 3


================================================================================
DATEI: 01-WEBSITE.md
================================================================================

# 01 — Website (Frontend)

## Hosting

| Eigenschaft | Wert |
|-------------|------|
| URL | https://buzzard24.de |
| Hosting | GitHub Pages |
| Framework | Next.js 15 (Static Export) |
| Deploy | Push auf `main` → `.github/workflows/deploy-pages.yml` |
| CDN/SSL | GitHub Pages TLS |

## Seiten (öffentlich)

| Route | Status | Inhalt |
|-------|--------|--------|
| `/` | ✅ Live | Startseite, Kategorien, Produkte |
| `/kategorie/…` | ✅ Live | 53 Hauptkategorien, Mehrsprachigkeit |
| `/produkt/…` | ✅ Live | Produktseiten (Demo-Daten) |
| `/impressum/` | ✅ Live | Impressum + Kontaktformular |
| `/datenschutz/` | ✅ Live | DSGVO |
| `/hilfe/` | ✅ Live | FAQ + Kontakt |
| `/agb/` | ✅ Live | AGB Katalogmodus |
| `/versand/` | ✅ Live | Versand-Info (kein Versand aktiv) |
| `/widerruf/` | ✅ Live | Widerrufsrecht |
| `/kontakt/` | ✅ Redirect | → `/impressum/` |
| `/admin/login/` | ✅ Live | Admin (Passwort in Render) |
| `/sitemap.xml` | ✅ Live | SEO Sitemap |
| `/robots.txt` | ✅ Live | Crawler-Regeln |

## Katalogmodus

- `NEXT_PUBLIC_SALES_ENABLED=0` — keine Preise, kein Checkout
- Produkte zeigen „Preis auf Anfrage“
- Warenkorb/Checkout-Seiten existieren, Bestellung wird API-seitig blockiert

## Kontakt auf der Website

| Kanal | Wert |
|-------|------|
| E-Mail | info@buzzard24.de |
| Telefon | +49 151 26219394 |
| Formular | FormSubmit auf Impressum + Hilfe |
| Zentrale Config | `lib/site/contact.ts` |

## Live vs. PR #238 (noch nicht gemergt)

**Aktuell live** (main @ ec4a21a):
- Texte enthalten noch „Demo-Katalog“, „VERKAUF FOLGT DEMNÄCHST“
- Newsletter zeigt nur lokale Bestätigung (kein echter Versand)

**Nach PR #238:**
- Professionelle Katalog-Texte
- Newsletter → FormSubmit
- Dynamische Kategorieanzahl (53)
- Zentrale Firmendaten mit PLZ 35232 Dautphetal
- Rechtliche Seiten ohne Stub-Hinweis

## Wichtige Dateien im Repo

```
app/                    # Next.js Seiten
components/             # UI (Header, Footer, ContactForm, …)
lib/site/contact.ts     # E-Mail + Telefon
lib/site/company.ts     # Firmendaten (PR #238)
lib/i18n/               # DE, EN, TR, AR
lib/categories/         # 53 Kategorien
public/_redirects       # Legacy-Redirects
.github/workflows/deploy-pages.yml
```

## Mehrsprachigkeit

- Deutsch (Standard), Englisch, Türkisch, Arabisch (RTL)
- Locale-Pfade: `/en/`, `/tr/`, `/ar/`


================================================================================
DATEI: 02-API-BACKEND.md
================================================================================

# 02 — API & Backend (Render)

## Service: buzzard-api

| Eigenschaft | Wert |
|-------------|------|
| URL | https://buzzard-api.onrender.com |
| Health | https://buzzard-api.onrender.com/api/health |
| Runtime | Node.js |
| Region | Frankfurt |
| Plan | Free |
| Branch | main |
| Start | `node server/server.js` |

## Live-Health (27.08.2026)

```json
{
  "status": "ok",
  "salesEnabled": false,
  "database": { "users": 1, "products": 26, "orders": 0 }
}
```

## Wichtige Env-Variablen (Render)

| Variable | Wert | Bedeutung |
|----------|------|-----------|
| `BUZZARD_SALES_ENABLED` | `0` | **Verkauf aus** |
| `ADMIN_EMAIL` | admin@buzzard24.de | Admin-Login |
| `ADMIN_PASSWORD` | *(in Render setzen)* | **Du musst das setzen** |
| `JWT_SECRET` | auto-generiert | Session-Tokens |
| `BUZZARD_EMBEDDED_INTELLIGENCE` | `1` | Intelligence ohne Python |
| `BUZZARD_INTELLIGENCE_BRIDGE` | `1` | Shop ↔ Intelligence |
| `BUZZARD_INTELLIGENCE_API_URL` | buzzard-intelligence | Python-Stack |
| `BUZZARD_ORCHESTRATOR_URL` | buzzard-orchestrator | Nach PR #238 |

## API-Endpunkte (Auswahl)

| Pfad | Beschreibung |
|------|--------------|
| `GET /api/health` | Systemstatus |
| `GET /api/intelligence/status` | Intelligence Bridge |
| `GET /api/orchestrator/status` | AI Orchestrator (PR #238) |
| `POST /api/auth/login` | Kunden-Login |
| Admin-Routen | `/api/admin/*` (JWT + optional 2FA) |

## Datenbank

- SQLite auf Render (`/opt/render/project/src/server/data/buzzard.db`)
- **Ohne Persistent Disk:** DB kann bei Redeploy zurückgesetzt werden
- Für Katalogmodus OK; vor Verkauf Persistent Disk einplanen

## Service: buzzard-intelligence

| Eigenschaft | Wert |
|-------------|------|
| Runtime | Docker (Python/FastAPI) |
| Health | `/health` |
| Cold Start | Free Tier — kann langsam sein |
| Fallback | Embedded Intelligence auf Node-API |

## Service: buzzard-orchestrator (PR #238)

| Eigenschaft | Wert |
|-------------|------|
| Datei | `intelligence/buzzard_orchestrator.py` |
| Health | `/health` |
| Zweck | AI-Task-Management, Approvals, Audit |
| Status | Im PR, noch nicht live |

## Blueprint

Konfiguration: `render.yaml` im Repo-Root  
Deutsche Anleitung: `docs/RENDER_API_SETUP_DE.md`

## Plugins (Node-Server)

56 Plugins unter `server/plugins/` — u.a.:
- `adminAuthPlugin.js` — Admin-Login
- `intelligenceProductionBridgePlugin.js` — Intelligence
- `orchestratorBridgePlugin.js` — Orchestrator (PR #238)
- `contactStoragePlugin.js` — Kontaktanfragen


================================================================================
DATEI: 03-EMAIL-KONTAKT.md
================================================================================

# 03 — E-Mail & Kontakt

## Öffentliche Kontaktdaten

| Kanal | Wert | Wo sichtbar |
|-------|------|-------------|
| E-Mail | info@buzzard24.de | Footer, Impressum, ServiceBar |
| Telefon | +49 151 26219394 | Impressum, Hilfe, ServiceBar |
| Admin | admin@buzzard24.de | Nur Admin-Bereich |

Zentrale Config: `lib/site/contact.ts`

## E-Mail-Provider: IONOS

| Eigenschaft | Status |
|-------------|--------|
| Postfach info@buzzard24.de | ✅ Eingerichtet |
| Webmail | https://webmail.ionos.de |
| Empfang getestet | ✅ Funktioniert |
| Anleitung | `docs/EMAIL_SETUP_IONOS.md` |

## Kontaktformular: FormSubmit

| Eigenschaft | Wert |
|-------------|------|
| Service | https://formsubmit.co |
| Ziel | info@buzzard24.de |
| Seiten | Impressum, Hilfe |
| Methode | Native HTML POST (kein AJAX) |
| Schutz | Honeypot, Rate-Limit, Zeit-Trap |
| Komponente | `components/ContactForm.tsx` |

### Ablauf

1. Besucher füllt Formular aus
2. POST an FormSubmit
3. FormSubmit leitet E-Mail an info@buzzard24.de
4. Redirect zurück mit `?sent=1`

## Newsletter (nach PR #238)

| Live (main) | Nach PR #238 |
|-------------|--------------|
| Nur lokale Fake-Meldung | FormSubmit → info@buzzard24.de |
| Kein echter Versand | Betreff: „Buzzard Newsletter-Anmeldung“ |

Komponente: `components/home/HomeNewsletter.tsx`

## Was nicht eingerichtet ist

- SMTP für System-Mails (Bestellbestätigungen) — erst mit Verkauf
- GitHub-Account Primär-E-Mail auf info@buzzard24.de — optional

## Support-Antwortzeit (Website-Text)

1–2 Werktage (Hilfe/FAQ)


================================================================================
DATEI: 04-RECHTLICHES.md
================================================================================

# 04 — Rechtliches & Compliance

## Seiten

| Seite | URL | Status live | Nach PR #238 |
|-------|-----|-------------|--------------|
| Impressum | /impressum/ | ✅ Basis | + PLZ, OS-Plattform, USt-ID-fähig |
| Datenschutz | /datenschutz/ | ✅ DSGVO | + FormSubmit, Render, Newsletter |
| AGB | /agb/ | ✅ Stub | Fertige Katalog-AGB |
| Widerruf | /widerruf/ | ✅ Stub | Katalogmodus erklärt |
| Versand | /versand/ | ✅ Stub | Kein Versand im Katalog |
| Hilfe/FAQ | /hilfe/ | ✅ | Backend live, FAQ aktualisiert |

## Impressum — aktuell vs. vollständig

**Live (main):**
```
Buzzard Kfz-Teile
Dautphetal
Deutschland
Tel: +49 151 26219394
E-Mail: info@buzzard24.de
```

**Nach PR #238 (Standard ohne Secrets):**
```
Buzzard Kfz-Teile
35232 Dautphetal
Deutschland
```

**Empfohlen (GitHub Secrets):**
- `NEXT_PUBLIC_COMPANY_STREET` — Straße + Hausnummer
- `NEXT_PUBLIC_COMPANY_VAT_ID` — USt-IdNr.

Config: `lib/site/company.ts`

## DSGVO

- Keine Tracking-Cookies
- FormSubmit als Auftragsverarbeiter (Kontakt + Newsletter)
- Render als Backend-Host (Kundenkonto)
- GitHub Pages als Website-Host
- Betroffenenrechte: info@buzzard24.de

## Katalogmodus rechtlich

- Kein Fernabsatz aktiv → kein Widerrufsrecht für Käufe
- Produktdarstellung = unverbindliche Information
- AGB §3 Katalogmodus (PR #238)

## Online-Streitbeilegung

OS-Plattform verlinkt (PR #238) — keine Pflicht zur Teilnahme an Schlichtung

## Security

- CSP, HSTS, Rate-Limiting
- Admin 2FA verfügbar
- Details: `docs/SECURITY.md`
- security.txt: `public/.well-known/security.txt`

## Offen (rechtlich)

| Punkt | Priorität |
|-------|-----------|
| Volle Straßenadresse | Hoch |
| USt-IdNr. (falls vorhanden) | Mittel |
| AGB für aktiven Verkauf | Erst bei Verkaufsstart |


================================================================================
DATEI: 05-AI-ORCHESTRATOR.md
================================================================================

# 05 — AI Orchestrator

## Was ist das?

Zentraler **Task-Management-Service** für Buzzard-AI-Agenten. Verwaltet Aufgaben, Berechtigungen, menschliche Freigaben und Audit-Logs.

**Datei:** `intelligence/buzzard_orchestrator.py`  
**Status:** Im PR #238 — noch nicht auf `main` / Render

## Registrierte Agenten

| ID | Name | Rolle |
|----|------|-------|
| nesrin | Nesrin Hanım | Zentrale Koordination |
| supplier_ai | Tedarik AI | Einkauf / Lieferanten |
| product_ai | Ürün AI | Produkte / Kategorien |
| pricing_ai | Fiyat AI | Preise / Margen |
| order_ai | Sipariş AI | Bestellungen / Versand |
| customs_ai | Gümrük AI | Zoll / Import |
| security_ai | Esat Bey | Sicherheit |

## Features

- Task-Queue mit Priorität (critical → low)
- Retry (max 3), Timeout (120s)
- Menschliche Freigabe ab 500 € oder bei High-Risk
- SQLite-Persistenz
- REST API (FastAPI)
- Audit-Log aller Aktionen

## API-Endpunkte

| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | /health | Status |
| GET | /agents | Alle Agenten |
| POST | /tasks | Aufgabe erstellen |
| POST | /tasks/{id}/execute | Ausführen |
| POST | /tasks/{id}/approval | Freigabe |
| GET | /audit | Audit-Log |
| POST | /demo/daily-summary | Demo |
| POST | /demo/purchase-request | Demo (High-Risk) |

## Integration mit buzzard-api

Nach Deploy:
```
GET https://buzzard-api.onrender.com/api/orchestrator/status
GET https://buzzard-api.onrender.com/api/orchestrator/agents
GET https://buzzard-api.onrender.com/api/orchestrator/tasks
```

Bridge: `server/lib/orchestratorBridge.js`

## Lokal starten

```bash
npm run orchestrator:dev
# → http://127.0.0.1:8010/docs
```

## Wichtig

- **Simulation only** — keine echten Zahlungen/Bestellungen
- SQLite auf Render Free: `/tmp` (Reset bei Redeploy)
- Verkauf bleibt deaktiviert (`BUZZARD_SALES_ENABLED=0`)

Dokumentation: `docs/ORCHESTRATOR_DE.md`


================================================================================
DATEI: 06-INTELLIGENCE-STACK.md
================================================================================

# 06 — Intelligence Stack

## Übersicht

Buzzard hat einen umfangreichen **Python Intelligence-Stack** (`intelligence/`) — getrennt vom Node-Shop, aber über eine Bridge verbunden.

## Drei Ebenen

```
Website (GitHub Pages)
    ↓ API-Calls
buzzard-api (Node.js, Render)
    ↓ Bridge
buzzard-intelligence (Python/FastAPI, Render Docker)
    ↓ optional
buzzard-orchestrator (Python/FastAPI, PR #238)
```

## Embedded Intelligence (aktiv)

Wenn `BUZZARD_EMBEDDED_INTELLIGENCE=1`:
- Node-API liefert Intelligence-Daten ohne Python
- Fallback wenn buzzard-intelligence cold/slow
- Katalogmodus, Taxonomy, Production Bridge

Env: `BUZZARD_EMBEDDED_INTELLIGENCE=1` ✅

## Intelligence Bridge

| Endpunkt | Beschreibung |
|----------|--------------|
| `/api/intelligence/status` | Bridge-Status |
| `/api/intelligence/production/readiness` | Production Readiness |
| `/api/intelligence/storefront/products` | Storefront-Produkte |

Plugin: `server/plugins/intelligenceProductionBridgePlugin.js`

## buzzard-intelligence (Render)

| Eigenschaft | Wert |
|-------------|------|
| Docker | `intelligence/buzzard_ai_complete/deploy/docker/Dockerfile` |
| Port | 8000 |
| Health | `/health` |
| Free Tier | Cold Start möglich |

## AI Core (separater Kontext)

- Frozen Baseline Score 94/100
- Commerce E2E blockiert (externe Secrets)
- **Nicht ändern** ohne explizite Freigabe
- Secrets: `COMMERCE_API_TOKEN`, `COMMERCE_WEBHOOK_SECRET`, `BUZZARD_AI_CORE_V3`
- **Nicht nötig** für Katalog-Website

## Taxonomie

- 53 Hauptkategorien (DE)
- Auto-Sync Workflow: `.github/workflows/taxonomy-auto-sync.yml`
- Artifacts: `public/taxonomy/`

## Dokumentation im Repo

- `docs/BUZZARD_INTELLIGENCE.md`
- `intelligence/README.md`
- `intelligence/buzzard_ai_complete/docs/`


================================================================================
DATEI: 07-MONITORING-OPS.md
================================================================================

# 07 — Monitoring, Ops & Backup

## Automatische Checks

| Workflow | Trigger | Was |
|----------|---------|-----|
| `ci.yml` | Push/PR | Lint, Typecheck, Build |
| `deploy-pages.yml` | Push main | Website deploy |
| `verify-go-live.yml` | Push main | Live-Routen + API |
| `uptime-monitor.yml` | Alle 6h | Uptime (PR #238) |

## Manuelle Prüfung

```bash
npm run verify:go-live
npm run render:preflight
npm run security:check
```

## Render Health Checks

| Service | Pfad |
|---------|------|
| buzzard-api | /api/health |
| buzzard-intelligence | /health |
| buzzard-orchestrator | /health (PR #238) |

## Backup

| Was | Befehl | Hinweis |
|-----|--------|---------|
| SQLite lokal | `npm run db:backup` | Nur wenn API lokal |
| KI-Snapshot | `npm run backup:ki:quick` | Intelligence-Ordner |
| Render DB | Kein Auto-Backup | Persistent Disk nötig |

## Cloudflare (optional, nicht eingerichtet)

- DDoS, Bot-Filter, WAF
- Anleitung: `docs/CLOUDFLARE_SETUP_DE.md`

## Google Search Console (optional)

- Sitemap: https://buzzard24.de/sitemap.xml
- Secret: `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- Anleitung: `docs/GOOGLE_SEARCH_CONSOLE.md`

## Security

- Admin 2FA: `/admin/security-dashboard/`
- Rate-Limit: 180 req/min
- Account-Lockout: 5 Fehlversuche → 30 Min.
- `docs/SECURITY.md`

## Alerts (empfohlen)

- GitHub → Settings → Notifications → Action failures
- Optional: UptimeRobot auf buzzard24.de + API health

Dokumentation: `docs/MONITORING.md`


================================================================================
DATEI: 08-ARCHITEKTUR.md
================================================================================

# 08 — Architektur

## Systemdiagramm

```
                    ┌─────────────────────────────────┐
                    │         Besucher / Admin         │
                    └───────────────┬─────────────────┘
                                    │ HTTPS
                    ┌───────────────▼─────────────────┐
                    │      buzzard24.de               │
                    │   (GitHub Pages / Next.js)      │
                    │   Static Export, Katalogmodus   │
                    └───────────────┬─────────────────┘
                                    │ API-Calls
                    ┌───────────────▼─────────────────┐
                    │   buzzard-api.onrender.com    │
                    │   Node.js + SQLite + Plugins  │
                    │   SALES_ENABLED = 0           │
                    └───┬───────────────────┬───────┘
                        │                   │
           ┌────────────▼──────┐   ┌───────▼──────────────┐
           │ buzzard-intelligence│   │ buzzard-orchestrator │
           │ Python / FastAPI   │   │ Python / FastAPI     │
           │ (Docker, Render)   │   │ (PR #238)            │
           └────────────────────┘   └──────────────────────┘

    Extern:
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ IONOS E-Mail │  │  FormSubmit  │  │   GitHub     │
    │ info@buzzard │  │  Kontaktform │  │   CI/CD      │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## Repository-Struktur (Auszug)

```
Buzzard/
├── app/                    # Next.js Frontend
├── components/             # React UI
├── lib/                    # Shared (contact, seo, categories)
├── server/                 # Node API
│   ├── server.js
│   ├── plugins/            # 56 Feature-Plugins
│   └── lib/
├── intelligence/           # Python AI Stack
│   ├── buzzard_orchestrator.py  (PR #238)
│   └── buzzard_ai_complete/
├── data/                   # Katalog, Taxonomie
├── docs/                   # Anleitungen
├── exports/                # Berichte (dieser Ordner)
├── render.yaml             # Render Blueprint
└── .github/workflows/      # CI/CD
```

## Deploy-Pipeline

```
git push main
    ├── GitHub Actions: npm run build → GitHub Pages (buzzard24.de)
    └── Render Auto-Deploy: buzzard-api + intelligence (+ orchestrator)
```

## Umgebungsvariablen (Website-Build)

| Variable | Wert | Wo |
|----------|------|-----|
| NEXT_PUBLIC_SITE_URL | https://buzzard24.de | deploy-pages.yml |
| NEXT_PUBLIC_CONTACT_EMAIL | info@buzzard24.de | deploy-pages.yml |
| NEXT_PUBLIC_SALES_ENABLED | 0 | deploy-pages.yml |
| NEXT_PUBLIC_BUZZARD_API_URL | buzzard-api.onrender.com | deploy-pages.yml |
| NEXT_PUBLIC_COMPANY_STREET | *(optional Secret)* | GitHub |
| NEXT_PUBLIC_COMPANY_VAT_ID | *(optional Secret)* | GitHub |

## Sicherheitsgrenzen

| Was | Wo gespeichert |
|-----|----------------|
| ADMIN_PASSWORD | Render Secrets |
| JWT_SECRET | Render (auto) |
| Stripe/PayPal Keys | Render (leer, Verkauf aus) |
| 2FA Secrets | server/data/admin-2fa.json (nicht in Git) |

## Skalierung (später)

- Cloudflare vor Domain
- Render Persistent Disk für SQLite
- PostgreSQL statt SQLite
- Redis/Queue für Orchestrator


================================================================================
DATEI: 09-OFFENE-PUNKTE.md
================================================================================

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


================================================================================
DATEI: 10-BEFEHLE-LINKS.md
================================================================================

# 10 — Befehle & Links

## Live-URLs

| Was | URL |
|-----|-----|
| Website | https://buzzard24.de |
| Impressum | https://buzzard24.de/impressum/ |
| Hilfe | https://buzzard24.de/hilfe/ |
| Admin | https://buzzard24.de/admin/login/ |
| API Health | https://buzzard-api.onrender.com/api/health |
| Intelligence Status | https://buzzard-api.onrender.com/api/intelligence/status |
| Sitemap | https://buzzard24.de/sitemap.xml |

## Dashboards

| Was | URL |
|-----|-----|
| GitHub Repo | https://github.com/Buzzard-de/Buzzard |
| PR #238 | https://github.com/Buzzard-de/Buzzard/pull/238 |
| Render | https://dashboard.render.com |
| IONOS Webmail | https://webmail.ionos.de |
| Google Search Console | https://search.google.com/search-console |
| Cloudflare | https://dash.cloudflare.com |

## Terminal-Befehle

```bash
# Live-Check
npm run verify:go-live

# Render-Config prüfen
npm run render:preflight

# Security-Audit
npm run security:check

# API Health manuell
curl https://buzzard-api.onrender.com/api/health

# Orchestrator Status (nach PR #238)
curl https://buzzard-api.onrender.com/api/orchestrator/status

# Orchestrator lokal
npm run orchestrator:dev

# Website lokal
npm run dev

# API lokal
npm run dev:api

# DB Backup (lokal)
npm run db:backup

# KI Backup
npm run backup:ki:quick
```

## Dokumentation im Repo

| Thema | Datei |
|-------|--------|
| Go-Live | docs/GO_LIVE_PREP.md |
| Restliste | docs/WAS_NOCH_ZU_TUN.md |
| Admin | docs/ADMIN_SETUP_DE.md |
| E-Mail IONOS | docs/EMAIL_SETUP_IONOS.md |
| Render API | docs/RENDER_API_SETUP_DE.md |
| Orchestrator | docs/ORCHESTRATOR_DE.md |
| Cloudflare | docs/CLOUDFLARE_SETUP_DE.md |
| Monitoring | docs/MONITORING.md |
| Search Console | docs/GOOGLE_SEARCH_CONSOLE.md |
| Security | docs/SECURITY.md |

## Kontakt

- E-Mail: info@buzzard24.de
- Telefon: +49 151 26219394


================================================================================
DATEI: LIVE-SNAPSHOT.json
================================================================================

{
  "generated_at": "2026-08-27T20:41:14Z",
  "website": {
    "url": "https://buzzard24.de",
    "impressum_status": 200,
    "live_text_samples": [
      "Demo-Katalog",
      "Online-Katalog",
      "VERKAUF FOLGT",
      "info@buzzard24"
    ],
    "note": "Demo-Texte verschwinden nach Merge von PR #238"
  },
  "api": {
    "url": "https://buzzard-api.onrender.com",
    "health": {
      "success": true,
      "status": "ok",
      "app": "Buzzard API",
      "database": {
        "enabled": true,
        "users": 1,
        "products": 26,
        "orders": 0
      },
      "commercial": {
        "salesEnabled": false
      }
    }
  },
  "catalog": {
    "main_categories": 53,
    "sales_enabled": false,
    "mode": "catalog"
  },
  "contact": {
    "email": "info@buzzard24.de",
    "phone": "+49 151 26219394",
    "email_provider": "IONOS",
    "form_provider": "FormSubmit"
  },
  "git": {
    "main_head": "ec4a21a",
    "main_description": "Merge PR #236 catalog-polish",
    "pending_pr": 238,
    "pending_branch": "cursor/website-catalog-complete-c293"
  },
  "render_services": {
    "configured_in_blueprint": [
      "buzzard-api",
      "buzzard-intelligence",
      "buzzard-orchestrator"
    ],
    "note": "buzzard-orchestrator erst nach PR #238 + Blueprint-Sync"
  }
}


================================================================================
DATEI: MANIFEST.json
================================================================================

{
  "report_id": "buzzard24-komplettbericht-2026-08-27",
  "title": "Buzzard24 Komplettbericht — Website und Plattform",
  "language": "de",
  "created_at": "2026-08-27T20:33:00Z",
  "author": "Cursor Cloud Agent",
  "version": "1.0.0",
  "scope": [
    "website",
    "api",
    "email",
    "legal",
    "orchestrator",
    "intelligence",
    "monitoring",
    "operations"
  ],
  "excludes": [
    "sales_activation",
    "real_product_images",
    "payment_providers_production"
  ],
  "repository": "https://github.com/Buzzard-de/Buzzard",
  "live_site": "https://buzzard24.de",
  "pending_pr": "https://github.com/Buzzard-de/Buzzard/pull/238",
  "files": [
    "README.md",
    "00-ZUSAMMENFASSUNG.md",
    "01-WEBSITE.md",
    "02-API-BACKEND.md",
    "03-EMAIL-KONTAKT.md",
    "04-RECHTLICHES.md",
    "05-AI-ORCHESTRATOR.md",
    "06-INTELLIGENCE-STACK.md",
    "07-MONITORING-OPS.md",
    "08-ARCHITEKTUR.md",
    "09-OFFENE-PUNKTE.md",
    "10-BEFEHLE-LINKS.md",
    "LIVE-SNAPSHOT.json",
    "MANIFEST.json"
  ]
}

