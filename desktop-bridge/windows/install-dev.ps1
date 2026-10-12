# Development launcher helper for Windows. Does not sign, distribute, or update.
# Creates Desktop + Start Menu shortcuts. Not a verified installer.

$ErrorActionPreference = "Stop"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js 20+ is required. Install Node LTS, then run this again."
}
& (Join-Path $PSScriptRoot "install-desktop-shortcut.ps1")
Write-Output "Launch from the Desktop shortcut, or:"
Write-Output (Join-Path $PSScriptRoot "BuzzardBridge.cmd")
