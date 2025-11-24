@echo off
cd /d "C:\projects\bot_excel"
REM Получаем все аргументы и передаем их в скрипт
set "ARGS=%*"
if "%ARGS%"=="" (
    echo Error: File path not provided
    exit /b 1
)
node apply-formatting.js %ARGS%
exit /b %ERRORLEVEL%

