# Buzzard KI Gesamt — Sicherungsordner

Stand: 2026-08-18T21:19:48+00:00

Alle KI-/Intelligence-Bausteine von Buzzard an einem Ort.

## Struktur

| Ordner | Inhalt |
|--------|--------|
| `aktiv/` | Symlinks zu den live Python-/Taxonomie-Pfaden |
| `frontend/` | Kopie der Next.js KI-Komponenten und Clients |
| `server/` | Kopie der Node.js KI-Services und Plugins |
| `launchers/` | Kopie von Buzzard/ und gizli/ Startern |
| `manifests/` | Alle Intelligence-Manifeste (JSON) |
| `snapshots/` | Datierter Vollsicherungs-Snapshot + ZIP |

## Befehle

```bash
npm run backup:ki
cd intelligence && python3 main.py complete-build-ki-gesamt-backup --full-snapshot
```

Geschätzte Dateien: **1808**
Benannte Agenten: **73**

