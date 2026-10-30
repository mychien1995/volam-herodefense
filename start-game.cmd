@echo off
setlocal
cd /d "%~dp0"

rem Keep tool discovery local to this launcher and its child processes.
where.exe pnpm.cmd >nul 2>nul
if errorlevel 1 (
  if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback\pnpm.cmd" (
    set "PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin\fallback;%PATH%"
  ) else (
    echo Could not find pnpm. Install the pnpm version specified in package.json,
    echo then run this launcher again.
    pause
    exit /b 1
  )
)

echo Starting Vo Lam Hero Defense. Keep this terminal open.
echo Open the local URL printed by Vite, normally http://127.0.0.1:5173
echo Press Ctrl+C to stop.
call pnpm.cmd dev
set "game_exit_code=%ERRORLEVEL%"
if not "%game_exit_code%"=="0" pause
exit /b %game_exit_code%
