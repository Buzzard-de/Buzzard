@echo off
setlocal
cd /d "%~dp0..\.."
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 or newer is required to run Buzzard Desktop Bridge.
  echo Install Node LTS, then run this launcher again.
  exit /b 1
)
echo Starting Buzzard Desktop Bridge on 127.0.0.1 ...
echo This is a FILE HANDOFF tool. It cannot open your ChatGPT app session.
node desktop-bridge\src\index.js start %*
endlocal
