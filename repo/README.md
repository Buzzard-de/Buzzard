# Repo Deploy Helfer

Dieser Ordner enthält Hilfsskripte für den Push nach GitHub.

## Skripte

- `publish-github.ps1`: setzt Remote und pusht nach `main`
- `push-github-https.ps1`: setzt HTTPS-Modus und ruft `publish-github.ps1` auf
- `publish-github.cmd`: CMD-Wrapper für `publish-github.ps1`

## Schnellstart

```powershell
cd C:\Users\yanli\buzzard
setx GITHUB_REPO "Buzzard-de/Buzzard"
.\publish-github.cmd
```

Voraussetzung: `git` ist installiert und im PATH verfügbar.
