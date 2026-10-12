@echo off
setlocal
cd /d "%~dp0..\.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 or newer is required to run Buzzard Desktop Bridge.
  echo Install Node LTS from https://nodejs.org then run this launcher again.
  echo This is a FILE HANDOFF tool. It cannot open your ChatGPT app session.
  exit /b 1
)
if not defined BUZZARD_BRIDGE_HOME set "BUZZARD_BRIDGE_HOME=%USERPROFILE%\.buzzard-desktop-bridge"
if not exist "%BUZZARD_BRIDGE_HOME%" mkdir "%BUZZARD_BRIDGE_HOME%"
echo Starting Buzzard Desktop Bridge on 127.0.0.1 ...
echo DIRECT_CHATGPT_SESSION: NOT_AVAILABLE
echo Logs: %BUZZARD_BRIDGE_HOME%\bridge.log
echo Set BUZZARD_BRIDGE_OPEN_BROWSER=1 to open the UI after bind.
node desktop-bridge\src\index.js start %*
if errorlevel 1 (
  echo Bridge failed to start. If the port is in use, set BUZZARD_BRIDGE_PORT.
  echo See %BUZZARD_BRIDGE_HOME%\bridge.log
  exit /b 1
)
endlocal
