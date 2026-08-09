# Buzzard – Kfz-Teile (Next.js)

Online-Shop für Kfz-Ersatzteile, aufgebaut mit Next.js App Router.

## Projektstruktur

```
app/              Seiten (Startseite, Produkte, Impressum, Datenschutz)
components/       Header, Navbar, MegaMenu, CategorySidebar, FeaturedBanner, ProductList, Footer
public/           Statische Assets (Logo, manifest, robots.txt, CNAME)
styles/           Globale CSS-Dateien
lib/              Produktdaten, Kategorien, Warenkorb-Logik
types/            TypeScript-Typen
```

## Lokal starten

```powershell
cd C:\Users\yanli\buzzard
npm install
npm run dev
```

Dann `http://localhost:3000` im Browser öffnen.

## Build & Deployment

Statischer Export für GitHub Pages:

```powershell
npm run build
```

Der Build landet im Ordner `out/`. Der GitHub Actions Workflow baut und deployed automatisch bei Push auf `main`.

Live-Domain: https://www.buzzard24.de

## Buzzard API (Render)

Admin-Panels und dynamische Module benötigen die Node-API unter `https://buzzard-api.onrender.com`.

**Einmalig live schalten** (kein GitHub-Secret nötig):

1. [Render Blueprint öffnen](https://dashboard.render.com/blueprint/new?repo=https://github.com/Buzzard-de/Buzzard)
2. Mit GitHub anmelden und Blueprint deployen (`buzzard-api`, Region Frankfurt)
3. Health prüfen: `GET https://buzzard-api.onrender.com/api/health`

Alternativ: GitHub Secret `RENDER_API_KEY` setzen und Workflow **Setup Render API** ausführen.

## Lokale API (optional)

Der Ordner `server/` enthält eine optionale lokale API für das Kontaktformular im Entwicklungsmodus.
