$git = 'C:\Program Files\Git\cmd\git.exe'
$repoPath = 'C:\Users\yanli\buzzard'
$sshDir = "$env:USERPROFILE\.ssh"

if (-not (Test-Path $git)) {
    Write-Error "git.exe wurde nicht gefunden: $git"
    exit 1
}

if (-not (Test-Path $repoPath)) {
    Write-Error "Projektordner nicht gefunden: $repoPath"
    exit 1
}

Set-Location -Path $repoPath

if (-not (Test-Path ".git")) {
    & $git init
}

& $git config user.name "BUzzard"
& $git config user.email "info@buzzard.com"
& $git add .
& $git commit -m "Initial commit: Buzzard static site and GitHub Pages workflow" 2>$null
& $git branch -M main
& $git remote remove origin 2>$null
& $git remote add origin git@github.com:Buzzard/buzzard.git

if (-not (Test-Path $sshDir)) {
    New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
}

$sshScan = 'C:\Program Files\Git\usr\bin\ssh-keyscan.exe'
if (-not (Test-Path $sshScan)) {
    $sshScan = 'C:\Program Files\Git\mingw64\usr\bin\ssh-keyscan.exe'
}

if (Test-Path $sshScan) {
    & $sshScan github.com | Out-File -FilePath "$sshDir\known_hosts" -Encoding ascii -Append
}

& $git push -u origin main
