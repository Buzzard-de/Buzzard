# Lokaler Repo‑Ordner für Buzzard

Dieser Ordner dient als lokaler Platzhalter für das Git‑Repository.

Anleitung zum Initialisieren und Pushen nach GitHub:

```powershell
cd C:\Users\yanli\buzzard
# Initialisiere Git (falls noch nicht vorhanden)
git init
git branch -M main
git add .
git commit -m "Initial commit: Buzzard static site"
# Füge das Remote-Repository hinzu (ersetze URL durch dein Repo)
# SSH:
git remote add origin git@github.com:Buzzard/buzzard.git
git push -u origin main
# Oder HTTPS:
# git remote add origin https://github.com/Buzzard/buzzard.git
# git push -u origin main
```

Hinweis:
- Auf diesem System ist `git` scheinbar nicht installiert; installiere Git falls nötig: https://git-scm.com/download/win
- Wenn du möchtest, kann ich das Remote‑Repo über die GitHub API anlegen — dafür benötige ich ein temporäres PAT mit den Scopes `repo` und `workflow`.
