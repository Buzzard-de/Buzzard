$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoPath = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $repoPath
$env:GITHUB_USE_HTTPS = '1'
& "$scriptDir\publish-github.ps1"
