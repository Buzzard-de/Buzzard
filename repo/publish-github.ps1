# Publish the Buzzard website to GitHub and set up GitHub Pages.
# This script asks for your GitHub PAT and the target repository path.

$git = 'C:\Program Files\Git\cmd\git.exe'
if (-not (Test-Path $git)) {
    Write-Error "git.exe wurde nicht gefunden: $git"
    exit 1
}

Set-Location 'C:\Users\yanli\buzzard'

if (-not (Test-Path '.git')) {
    & $git init
}

& $git config user.name "BUzzard"
& $git config user.email "info@buzzard.com"
& $git add .
& $git commit -m "Prepare Buzzard static website for GitHub Pages" 2>$null
& $git branch -M main

$token = $env:GITHUB_TOKEN
if (-not $token) {
    $secureToken = Read-Host -AsSecureString 'Gib deinen GitHub-PAT ein (sichtbar wird er nicht)'
    $token = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
    )
}

if (-not $token) {
    Write-Error "Ein GitHub-PAT ist erforderlich, um das Repository zu erstellen und zu pushen."
    exit 1
}

$defaultRepo = 'Buzzard/buzzard'
$repo = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else {
    $input = Read-Host "Gib den GitHub-Repo-Pfad ein (z.B. Buzzard/buzzard) [Standard: $defaultRepo]"
    if ([string]::IsNullOrWhiteSpace($input)) { $defaultRepo } else { $input.Trim() }
}

Write-Host "Verwende GitHub-Repo: $repo"

if ($repo -notmatch '^[^/]+/[^/]+$') {
    Write-Error "Ungültiges Repo-Format. Verwende owner/repo, z.B. Buzzard/buzzard."
    exit 1
}

$owner, $name = $repo -split '/', 2
$apiHeaders = @{
    Authorization = "token $token"
    Accept = 'application/vnd.github+json'
    'User-Agent' = 'Buzzard-Publisher'
}

$repoApiUrl = "https://api.github.com/repos/$repo"
$repoExists = $false
try {
    Invoke-RestMethod -Uri $repoApiUrl -Method Get -Headers $apiHeaders -ErrorAction Stop | Out-Null
    $repoExists = $true
} catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.Value__ -eq 404) {
        $repoExists = $false
    } elseif ($_.Exception.Response -and $_.Exception.Response.StatusCode.Value__ -eq 401) {
        Write-Error "GitHub API-Fehler: 401 Unauthorized. Dein PAT ist ungültig oder hat nicht die nötigen Berechtigungen. Erstelle einen neuen Token mit mindestens 'repo' oder 'contents: read' und 'pages: write' und versuche es erneut."
        exit 1
    } else {
        Write-Error "GitHub API-Fehler: $($_.Exception.Message)"
        exit 1
    }
}

if (-not $repoExists) {
    Write-Host "Repository $repo existiert nicht. Versuche es jetzt zu erstellen..."
    try {
        $user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Method Get -Headers $apiHeaders -ErrorAction Stop
    } catch {
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode.Value__ -eq 401) {
            Write-Error "GitHub-Authentifizierung fehlgeschlagen: 401 Unauthorized. Dein PAT ist ungültig oder hat nicht die richtigen Rechte. Erstelle einen neuen Token und gib ihn erneut ein."
        } else {
            Write-Error "Kann GitHub-Benutzerinformationen nicht abrufen: $($_.Exception.Message)"
        }
        exit 1
    }

    if ($owner -ieq $user.login) {
        $body = @{ name = $name; private = $false; description = 'Buzzard static website'; auto_init = $false }
        Invoke-RestMethod -Uri 'https://api.github.com/user/repos' -Method Post -Headers $apiHeaders -Body (ConvertTo-Json $body) -ErrorAction Stop
        Write-Host "Repository $repo wurde erstellt."
    } else {
        $fallbackRepo = "$($user.login)/$name"
        $choice = Read-Host "Du hast keine Berechtigung zum Erstellen in der Organisation '$owner'. Soll das Repository stattdessen unter deinem Benutzer '$fallbackRepo' erstellt werden? [J/n]"
        if ([string]::IsNullOrWhiteSpace($choice) -or $choice -match '^[JjYy]') {
            $repo = $fallbackRepo
            $owner = $user.login
            $repoApiUrl = "https://api.github.com/repos/$repo"
            $body = @{ name = $name; private = $false; description = 'Buzzard static website'; auto_init = $false }
            Invoke-RestMethod -Uri 'https://api.github.com/user/repos' -Method Post -Headers $apiHeaders -Body (ConvertTo-Json $body) -ErrorAction Stop
            Write-Host "Repository $repo wurde erstellt."
        } else {
            try {
                $body = @{ name = $name; private = $false; description = 'Buzzard static website' }
                Invoke-RestMethod -Uri "https://api.github.com/orgs/$owner/repos" -Method Post -Headers $apiHeaders -Body (ConvertTo-Json $body) -ErrorAction Stop
                Write-Host "Repository $repo wurde erstellt."
            } catch {
                Write-Error "Repo existiert nicht und konnte nicht automatisch erstellt werden. Erstelle es manuell auf GitHub oder prüfe, ob du Zugriff auf die Organisation $owner hast."
                exit 1
            }
        }
    }
} else {
    Write-Host "Repository $repo existiert bereits."
}

try {
    $patchBody = @{ private = $false }
    Invoke-RestMethod -Uri $repoApiUrl -Method Patch -Headers $apiHeaders -Body (ConvertTo-Json $patchBody) -ErrorAction Stop | Out-Null
    Write-Host "Repository-Visibility wurde auf public gesetzt."
} catch {
    Write-Warning "Konnte Repository-Visibility nicht ändern: $($_.Exception.Message)"
}

$workflowDir = '.github\workflows'
if (-not (Test-Path $workflowDir)) {
    New-Item -ItemType Directory -Path $workflowDir -Force | Out-Null
}

$workflowFile = Join-Path $workflowDir 'deploy-pages.yml'
$workflowContent = @'
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Upload artifact for GitHub Pages
        uses: actions/upload-pages-artifact@v1
        with:
          path: ./
      - name: Deploy to GitHub Pages
        uses: actions/deploy-pages@v1
'@

$workflowContent | Set-Content -Path $workflowFile -Encoding UTF8
Write-Host "Workflow-Datei $workflowFile wurde angelegt oder aktualisiert."

& $git add .
& $git commit -m "Prepare Buzzard static website for GitHub Pages" 2>$null
& $git branch -M main

$remoteRepoHttps = "https://github.com/$repo.git"
& $git remote remove origin 2>$null
& $git remote add origin $remoteRepoHttps

$remoteUrl = "https://x-access-token:$token@github.com/$repo.git"
& $git push -u $remoteUrl main

Write-Host "Dein Projekt wurde gepusht."
Write-Host "Repo: https://github.com/$repo"
Write-Host "GitHub Pages läuft nach dem ersten erfolgreichen Workflow unter: https://$owner.github.io/$name"
Write-Host "Öffne dein Repository auf GitHub und gehe zu Settings → Pages, falls GitHub Pages noch nicht aktiviert ist."