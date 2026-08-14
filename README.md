# Buzzard – Kfz-Teile (Next.js)

Online-Shop für Kfz-Ersatzteile mit Next.js App Router, statischem GitHub-Pages-Frontend und optionaler Node-API (SQLite + Admin-Module v1.x–v4.0).

## Projektstruktur

```
app/              Next.js Seiten (Shop, Admin, Konto)
components/       UI-Komponenten
lib/              Frontend-Clients, Shop-Logik, API-Config
server/           Node-API (SQLite, Plugins, Admin-Routen)
scripts/          Build, Deploy-Helfer, Verify
data/             Seed-Daten, Kategorien
intelligence/     Python MVP: Markt-/Produkt-Intelligence (SQLite)
docs/             Go-Live, Security, Intelligence-Doku
styles/           Globale CSS
public/           Statische Assets
```

## Architektur

| Schicht | Technologie | Hinweis |
|---------|-------------|---------|
| Frontend | Next.js static export → GitHub Pages | `NEXT_PUBLIC_*` wird beim Build gebacken |
| API | Node + SQLite (Render) | `BUZZARD_*` Flags auf dem Server |
| Katalog | Statische JSON-Dateien in `data/` | Produktseiten, Kategorien |
| Bestellungen/Konto | SQLite via API | wenn `NEXT_PUBLIC_SQLITE_STORE=1` |

**Dual-Stack:** Mit `NEXT_PUBLIC_SQLITE_STORE=1` (Production) nutzen Konto, Warenkorb und Admin die SQLite-API. Ohne Flag läuft der Legacy JSON-Modus lokal.

## Lokal starten (VS Code / Cursor)

**Voraussetzungen:** Node.js 20+ (siehe `.nvmrc`)

```bash
git clone https://github.com/Buzzard-de/Buzzard.git
cd Buzzard
cp .env.local.example .env.local
npm install
npm run dev:all
```

| URL | Zweck |
|-----|--------|
| http://localhost:3000 | Shop |
| http://localhost:3001/api/health | API Health |
| http://localhost:3000/admin/ | Admin (Login: siehe `.env.local.example`) |

**Einzeln starten:**

```bash
npm run dev        # nur Frontend
npm run dev:api    # nur API
```

**VS Code / Cursor:** Task **„Buzzard: Dev (Frontend + API)“** (Strg+Shift+B) oder Debug **„Buzzard Full Stack“**.

## Scripts

| Befehl | Beschreibung |
|--------|--------------|
| `npm run dev:all` | Frontend + API parallel |
| `npm run build` | Statischer Export → `out/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript prüfen |
| `npm run verify:go-live` | Production-Routen + API prüfen |
| `npm run verify:local` | Lokale Routen prüfen |
| `npm run security:audit` | npm audit (high+) |

## Build & Deployment

Statischer Export für **GitHub Pages** — deployt automatisch bei Push auf `main`.

Live: https://buzzard24.de

## Buzzard API (Render) — später

Admin-Module mit echten KPIs brauchen die Node-API auf Render (`https://buzzard-api.onrender.com`).

**Go-Live (wenn bereit):**

1. https://github.com/apps/render → GitHub-App installieren
2. https://render.com → New → Blueprint → Repo **Buzzard-de/Buzzard**
3. Health: `GET https://buzzard-api.onrender.com/api/health`

Alternativ: GitHub Secret `RENDER_API_KEY` + Workflow **Setup Render API**.

Lokal funktioniert alles ohne Render — siehe **Lokal starten** oben.

## Weitere Docs

- `BUZZARD_MASTER_IMPLEMENTATION.md` — Architektur & Module
- `docs/BUZZARD_INTELLIGENCE.md` — Python Intelligence MVP
- `server/plugins/README.md` — API-Endpunkte
- `data/BUZZARD_FINAL_GO_LIVE_CHECKLIST.md` — Go-Live-Checkliste
