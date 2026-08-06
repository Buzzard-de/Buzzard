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

## Lokale API (optional)

Der Ordner `server/` enthält eine optionale lokale API für das Kontaktformular im Entwicklungsmodus.
