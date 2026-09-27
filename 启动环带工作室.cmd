@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 20 或更新版本，然后重新打开此文件。
  pause
  exit /b 1
)
node server.mjs --open
pause
