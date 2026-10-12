@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 gerekli.
  start https://nodejs.org
  pause
  exit /b 1
)
echo 7/24 dosya bekcisi. ChatGPT oturumuna baglanmaz. Cursor otomatik calismaz.
echo Laptop acik kalmali. Bu pencereyi kapatma.
node "%~dp0src\index.js" watch
pause
endlocal
