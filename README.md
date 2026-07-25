# Buzzard – Kfz-Teile (Statische Webseite)

Kurzanleitung zum lokalen Testen, Deployment und Konfiguration.

## Lokal starten

Mit Python 3 im Projektordner:

```powershell
python -m http.server 8000
# Öffne dann http://localhost:8000 im Browser
```

Oder mit einem beliebigen Static‑Server / Live Server in VS Code.

## Kontaktformular

Das Formular sendet per [FormSubmit.co](https://formsubmit.co) an `info@buzzard.com`.
Wenn du eine andere Empfängeradresse möchtest, ändere das `action`-Attribut im Formular in `index.html`.

## Deployment‑Optionen

- GitHub Pages: Repository erstellen, Branch `gh-pages` oder `main` nutzen, Pages aktivieren.
- Netlify: Drag & drop des Ordners oder Git‑Verbindung; FormSubmit funktioniert weiterhin.
- Andere: S3/Cloudflare Pages/Vercel sind ebenfalls möglich.

## SEO & Accessibility – To Do / Empfehlungen

- Füge aussagekräftige Meta‑Tags pro Seite hinzu (Title/Description/OpenGraph).
- Optimiere `logo/logo.png` in Web‑optimierte Formate (`webp`, verschiedene Größen).
- Erstelle `sitemap.xml` und reiche die URL bei Suchmaschinen ein.
- Überprüfe Kontrast und Tastaturnavigation; Skip‑Link bereits eingebaut.

Hinweis: Ersetze in `sitemap.xml` und in den JSON‑LD Blöcken (`index.html`, `products.html`) die Platzhalter‑Domain `https://example.com` durch deine echte Website‑URL, damit Suchmaschinen die korrekten Links indexieren.

## Weiteres

Wenn du möchtest, erstelle ich:

- optimierte Bildvarianten (`logo-128.png`, `logo-192.png`, `logo-512.png`) und ein Web‑Manifest;
- eine ZIP‑Export‑Datei des Projekts;
- ein Impressum/Datenschutz mit konkreten Unternehmensdaten (ich habe Vorlagen hinzugefügt).
