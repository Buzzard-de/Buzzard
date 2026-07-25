@echo off
setlocal
if not defined GITHUB_REPO set "GITHUB_REPO=Buzzard/buzzard"
pushd "%~dp0\.."
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\repo\publish-github.ps1"
set EXIT_CODE=%ERRORLEVEL%
popd
exit /b %EXIT_CODE%
