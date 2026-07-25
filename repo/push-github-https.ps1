# GitHub Push helper for Buzzard
# Usage:
# 1. Set a GitHub personal access token in GITHUB_TOKEN.
# 2. Optionally set GITHUB_REPO to a custom private repo like Owner/Repo.
# 3. Run the script from PowerShell.
# Example:
#    $env:GITHUB_TOKEN = '<PAT>'
#    $env:GITHUB_REPO = 'Buzzard/buzzard'
#    .\repo\push-github-https.ps1

$git = 'C:\Program Files\Git\cmd\git.exe'
$repoPath = 'C:\Users\yanli\buzzard'
$defaultRepo = 'Buzzard/buzzard'

if (-not (Test-Path $git)) {
    Write-Error "git.exe wurde nicht gefunden: $git"
    exit 1
}

if (-not (Test-Path $repoPath)) {
    Write-Error "Projektordner nicht gefunden: $repoPath"
    exit 1
}

Set-Location -Path $repoPath

if (-not (Test-Path '.git')) {
    & $git init
}

& $git config user.name "BUzzard"
& $git config user.email "info@buzzard.com"
& $git add .
& $git commit -m "Initial commit: Buzzard static site and GitHub Pages workflow" 2>$null
& $git branch -M main

$token = $env:GITHUB_TOKEN
$repo = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { $defaultRepo }
$remoteRepo = "https://github.com/$repo.git"

if ($token) {
    $remoteUrl = "https://x-access-token:$token@github.com/$repo.git"
    Write-Host "Verwende GitHub Token aus GITHUB_TOKEN für den Push nach $repo."
    & $git remote remove origin 2>$null
    & $git remote add origin $remoteRepo
    & $git push -u $remoteUrl main
} else {
    Write-Host "Kein GITHUB_TOKEN gefunden. Versuche Push über origin und Git-Credential-Manager."
    & $git remote remove origin 2>$null
    & $git remote add origin $remoteRepo
    & $git push -u origin main
}
