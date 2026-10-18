@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 veya daha yenisi gerekli.
  echo Simdi nodejs.org acilacak. LTS kur, sonra START.cmd dosyasina tekrar cift tikla.
  start https://nodejs.org
  pause
  exit /b 1
)

if not defined BUZZARD_BRIDGE_HOME set "BUZZARD_BRIDGE_HOME=%USERPROFILE%\.buzzard-desktop-bridge"
if not exist "%BUZZARD_BRIDGE_HOME%" mkdir "%BUZZARD_BRIDGE_HOME%"
if not defined BUZZARD_BRIDGE_OPEN_BROWSER set "BUZZARD_BRIDGE_OPEN_BROWSER=1"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0MASAUSTUNE-KOY.ps1" -Quiet >nul 2>&1

echo Buzzard Desktop Bridge basliyor...
echo Tarayici acilir. Bu pencereyi kapatma.
echo DIRECT_CHATGPT_SESSION: NOT_AVAILABLE

node "%~dp0src\index.js" start
if errorlevel 1 (
  echo Kopru baslamadi.
  pause
  exit /b 1
)
pause
endlocal
