# Creates a Desktop shortcut to this extracted folder's START.cmd

param([switch]$Quiet)
$ErrorActionPreference = "Stop"

$cmd = Join-Path $PSScriptRoot "START.cmd"
if (-not (Test-Path $cmd)) { Write-Error "START.cmd not found." }

function New-BuzzardDesktopShortcut([string]$shortcutPath) {
  $folder = Split-Path -Parent $shortcutPath
  if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Force -Path $folder | Out-Null }
  $wsh = New-Object -ComObject WScript.Shell
  $shortcut = $wsh.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = $cmd
  $shortcut.WorkingDirectory = $PSScriptRoot
  $shortcut.WindowStyle = 1
  $shortcut.Description = "Buzzard Desktop Bridge"
  $shortcut.Save()
}

$desktop = [Environment]::GetFolderPath("Desktop")
if (-not $desktop) { $desktop = Join-Path $env:USERPROFILE "Desktop" }
New-BuzzardDesktopShortcut (Join-Path $desktop "Buzzard Desktop Bridge.lnk")

$startDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Buzzard"
New-BuzzardDesktopShortcut (Join-Path $startDir "Buzzard Desktop Bridge.lnk")

if (-not $Quiet) {
  Write-Output "Masaustu kisayolu hazir: Buzzard Desktop Bridge"
}
