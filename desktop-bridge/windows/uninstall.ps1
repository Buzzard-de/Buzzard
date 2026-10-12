# Removes Desktop and Start Menu shortcuts.
# Does not uninstall Node.js. Does not delete state unless -DeleteState is passed.

param(
  [switch]$DeleteState
)
$ErrorActionPreference = "Stop"

$desktop = [Environment]::GetFolderPath("Desktop")
if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE "Desktop" }
$desktopShortcut = Join-Path $desktop "Buzzard Desktop Bridge.lnk"
if (Test-Path $desktopShortcut) { Remove-Item -Force $desktopShortcut }

$startDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Buzzard"
$startShortcut = Join-Path $startDir "Buzzard Desktop Bridge.lnk"
if (Test-Path $startShortcut) { Remove-Item -Force $startShortcut }
if ((Test-Path $startDir) -and -not (Get-ChildItem $startDir -ErrorAction SilentlyContinue)) {
  Remove-Item $startDir
}

if ($DeleteState) {
  $home = Join-Path $env:USERPROFILE ".buzzard-desktop-bridge"
  if (Test-Path $home) { Remove-Item -Recurse -Force $home }
}

Write-Output "Desktop and Start Menu shortcuts removed."
Write-Output "Windows verification of this script: NOT_VERIFIED on Linux CI."
