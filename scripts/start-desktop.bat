@echo off
setlocal
title Easy Sprite
cd /d "%~dp0.."
if defined EASYSPRITE_HOME (
  set "WS=%EASYSPRITE_HOME%"
) else (
  set "WS=%cd%"
)
echo.
echo  Easy Sprite — desktop launcher
echo  Workspace: %WS%
echo  Close this window to stop the server.
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Install Node 20+ then try again.
  pause
  exit /b 1
)
if exist "node_modules\tsx\dist\cli.mjs" (
  node "node_modules\tsx\dist\cli.mjs" src\cli.ts desktop --workspace "%WS%"
) else if exist "dist\cli.js" (
  node dist\cli.js desktop --workspace "%WS%"
) else (
  npx --yes tsx src/cli.ts desktop --workspace "%WS%"
)
echo.
pause
