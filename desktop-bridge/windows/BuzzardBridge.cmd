@echo off
setlocal
cd /d "%~dp0..\.."

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 veya daha yenisi gerekli.
  echo https://nodejs.org adresinden Node LTS kur, sonra masaustundeki kisa yolu tekrar ac.
  echo This is a FILE HANDOFF tool. ChatGPT oturumunu acamaz.
  pause
  exit /b 1
)

if not defined BUZZARD_BRIDGE_HOME set "BUZZARD_BRIDGE_HOME=%USERPROFILE%\.buzzard-desktop-bridge"
if not exist "%BUZZARD_BRIDGE_HOME%" mkdir "%BUZZARD_BRIDGE_HOME%"

REM First launch: put a shortcut on THIS Windows desktop.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-desktop-shortcut.ps1" -Quiet >nul 2>&1

if not defined BUZZARD_BRIDGE_OPEN_BROWSER set "BUZZARD_BRIDGE_OPEN_BROWSER=1"

echo Buzzard Desktop Bridge basliyor...
echo Tarayici otomatik acilir. Pencereyi kapatma, kapatirsan kopru durur.
echo DIRECT_CHATGPT_SESSION: NOT_AVAILABLE
echo Log: %BUZZARD_BRIDGE_HOME%\bridge.log

node desktop-bridge\src\index.js start %*
if errorlevel 1 (
  echo Kopru baslamadi. Port doluysa: set BUZZARD_BRIDGE_PORT=47822
  echo Log: %BUZZARD_BRIDGE_HOME%\bridge.log
  pause
  exit /b 1
)

echo Kopru durdu.
pause
endlocal
