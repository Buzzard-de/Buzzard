# Removes the Start Menu shortcut created by install-dev.ps1.
# Does not uninstall Node.js. Does not delete ~/.buzzard-desktop-bridge unless
# -DeleteState is passed.

param(
  [switch]$DeleteState
)
$ErrorActionPreference = "Stop"
$startDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Buzzard"
$shortcutPath = Join-Path $startDir "Buzzard Desktop Bridge.lnk"
if (Test-Path $shortcutPath) { Remove-Item -Force $shortcutPath }
if ((Test-Path $startDir) -and -not (Get-ChildItem $startDir)) { Remove-Item $startDir }
if ($DeleteState) {
  $home = Join-Path $env:USERPROFILE ".buzzard-desktop-bridge"
  if (Test-Path $home) { Remove-Item -Recurse -Force $home }
}
Write-Output "Uninstall complete. Windows verification of this script: NOT_VERIFIED on Linux CI."
