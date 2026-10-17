# Puts Buzzard Desktop Bridge on THIS Windows desktop.
# Double-click the created shortcut. Requires Node.js 20+.
# Not a signed installer. Linux CI cannot verify this.

param(
  [switch]$Quiet
)

$ErrorActionPreference = "Stop"

$cmd = Join-Path $PSScriptRoot "BuzzardBridge.cmd"
if (-not (Test-Path $cmd)) {
  Write-Error "BuzzardBridge.cmd not found next to this script."
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function New-BuzzardDesktopShortcut([string]$shortcutPath) {
  $folder = Split-Path -Parent $shortcutPath
  if (-not (Test-Path $folder)) {
    New-Item -ItemType Directory -Force -Path $folder | Out-Null
  }
  $wsh = New-Object -ComObject WScript.Shell
  $shortcut = $wsh.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $cmd
  $shortcut.WorkingDirectory = $repoRoot
  $shortcut.WindowStyle = 1
  $shortcut.Description = "Buzzard Desktop Bridge - local ChatGPT/Cursor file handoff"
  $shortcut.Save()
}

$desktop = [Environment]::GetFolderPath("Desktop")
if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE "Desktop" }
$desktopShortcut = Join-Path $desktop "Buzzard Desktop Bridge.lnk"
New-BuzzardDesktopShortcut $desktopShortcut

$startDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Buzzard"
$startShortcut = Join-Path $startDir "Buzzard Desktop Bridge.lnk"
New-BuzzardDesktopShortcut $startShortcut

if (-not $Quiet) {
  Write-Output "Masaustu kisayolu: $desktopShortcut"
  Write-Output "Baslat menusu: $startShortcut"
  Write-Output "Cift tikla: Buzzard Desktop Bridge"
  Write-Output "Windows verification: NOT_VERIFIED on Linux CI."
}
