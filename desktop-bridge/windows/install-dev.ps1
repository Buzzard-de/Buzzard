# Development launcher helper for Windows. Does not sign, distribute, or update.
# Not a verified installer. Run in a developer PowerShell session.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$cmd = Join-Path $PSScriptRoot "BuzzardBridge.cmd"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js 20+ is required."
}
$startDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Buzzard"
New-Item -ItemType Directory -Force -Path $startDir | Out-Null
$shortcutPath = Join-Path $startDir "Buzzard Desktop Bridge.lnk"
$wsh = New-Object -ComObject WScript.Shell
$shortcut = $wsh.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $cmd
$shortcut.WorkingDirectory = $root
$shortcut.Description = "Buzzard ChatGPT-Cursor file-handoff bridge"
$shortcut.Save()
Write-Output "Created Start Menu shortcut: $shortcutPath"
Write-Output "Installer verification: NOT_VERIFIED (script only copies a shortcut)."
Write-Output "Launch: $cmd"
