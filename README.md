# Buzzard – Kfz-Teile (Statische Webseite)

Kurzanleitung für lokalen Test und Deployment auf GitHub Pages.

## Lokal starten

Im Projektordner:

```powershell
cd C:\Users\yanli\buzzard
python -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.

## Lokale API

Zusätzlich ist eine lokale API verfügbar, die das Kontaktformular im Entwicklungsmodus verarbeitet.

1. Wechsle in den API-Ordner:

```powershell
cd C:\Users\yanli\buzzard\server
```

2. Starte den Server:

```powershell
node server.js
```

Die API läuft unter `http://localhost:3000`.

## Kontaktformular

Im Browser wird das Formular bei `localhost`, `127.0.0.1` und `file://` an die lokale API gesendet.
Im Produktionsbetrieb bleibt das Formular bei FormSubmit für die E-Mail-Zustellung.

## Deployment auf GitHub Pages

1. Stelle sicher, dass `git` installiert ist:
   https://git-scm.com/download/win

2. Optional: Setze `GITHUB_REPO` (Standard ist `Buzzard-de/Buzzard`).

3. Starte das Skript im Projektordner:

```powershell
cd C:\Users\yanli\buzzard
.\publish-github.cmd
```

Vor dem Push kannst du alle vorbereitenden Checks ohne Login laufen lassen:

```powershell
cd C:\Users\yanli\buzzard\repo
powershell -NoProfile -ExecutionPolicy Bypass -File .\preflight-no-login.ps1
```

4. Folge der Authentifizierung von Git (SSH oder HTTPS/PAT), falls abgefragt.

Alternativ kannst du `repo\push-github-https.ps1` verwenden, um den Push per HTTPS auszuführen:

```powershell
cd C:\Users\yanli\buzzard\repo
powershell -NoProfile -ExecutionPolicy Bypass -File .\push-github-https.ps1
```

Hinweis: Das Skript pusht in ein bereits vorhandenes Repository. Falls das Repository noch nicht existiert, erstelle es zuerst auf GitHub.

## GitHub Pages URL

Wenn das Repo `Buzzard-de/Buzzard` heißt, wird die Seite voraussichtlich unter

`https://buzzard-de.github.io/Buzzard/`

verfügbar sein.

## Backup / Optionales

Unnötige Hilfsskripte und alte Dateien wurden in `backup/` verschoben.

## Nächste Schritte

## Go-Live Checkliste

- `git` installiert und Push nach `main` erfolgreich
- GitHub Actions Workflow `Deploy to GitHub Pages` grün
- Seite unter `https://buzzard-de.github.io/Buzzard/` erreichbar
- Kontaktformular lokal getestet (`http://localhost:3000/api/contact`)
- Impressum/Datenschutz mit echten Unternehmensdaten ersetzt
