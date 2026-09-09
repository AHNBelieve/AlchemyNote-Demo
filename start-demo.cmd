@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto missing_node

where npm >nul 2>nul
if errorlevel 1 goto missing_node

if exist "apps\web\node_modules\next" goto run

echo.
echo [AlchemyNote] Installing project dependencies for the first run...
where corepack >nul 2>nul
if errorlevel 1 goto npm_install
call corepack pnpm install
if not errorlevel 1 goto run

:npm_install
call npm --prefix apps\web install
if errorlevel 1 goto failed

:run
echo.
echo [AlchemyNote] Starting at http://localhost:3100
echo Wait until "Ready" appears, then open the address above.
echo Press Ctrl+C to stop the server.
echo.
call npm run dev
goto finished

:missing_node
echo.
echo [AlchemyNote] Node.js and npm were not found.
echo Install Node.js 22 or newer, reopen PowerShell, and run this file again.
echo.
pause
exit /b 1

:failed
echo.
echo [AlchemyNote] Dependency installation failed. Check the message above.
pause
exit /b 1

:finished
endlocal
