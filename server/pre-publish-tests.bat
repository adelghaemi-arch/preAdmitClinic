@echo off
chcp 65001 >nul
setlocal EnableExtensions
REM /*
REM  File: server/pre-publish-tests.bat
REM  Description: wrapper دروازهٔ تست قبل‌از‌انتشار — منطق در _pre-publish-tests.ps1
REM  Parent Dependencies: _pre-publish-tests.ps1, publish.bat
REM */

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0_pre-publish-tests.ps1"
exit /b %ERRORLEVEL%
