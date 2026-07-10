@echo off
setlocal
set "AURA_DESKTOP_DIR=%~dp0"
set "AURA_DESKTOP_PS1=%AURA_DESKTOP_DIR%start-aura-desktop.ps1"

if not exist "%AURA_DESKTOP_PS1%" (
  echo Aura GPT Desktop starter was not found:
  echo "%AURA_DESKTOP_PS1%"
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%AURA_DESKTOP_PS1%"
set "AURA_EXIT=%ERRORLEVEL%"

if not "%AURA_EXIT%"=="0" (
  echo Aura GPT Desktop exited with code %AURA_EXIT%.
  pause
)

exit /b %AURA_EXIT%
