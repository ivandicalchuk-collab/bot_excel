@echo off
setlocal enabledelayedexpansion
REM Resolve script directory
set "SCRIPT_DIR=%~dp0"

REM Always write a CMD-level start marker so we know .cmd launched
set "CMD_START_MARKER=%SCRIPT_DIR%cmd_started.marker"
echo startedAt=%DATE% %TIME%> "%CMD_START_MARKER%"
echo pid=%PROCESS_ID%>> "%CMD_START_MARKER%"
echo args=%*>> "%CMD_START_MARKER%"

REM Also capture args into a separate file for debugging
set "CMD_ARGS_LOG=%SCRIPT_DIR%cmd_args.txt"
echo %DATE% %TIME% %*>> "%CMD_ARGS_LOG%"

REM Basic args check (we expect at least inputFile and base64)
set "ARGCHECK_MARKER=%SCRIPT_DIR%cmd_argcheck.marker"
set ARGCOUNT=0
for %%A in (%*) do set /A ARGCOUNT+=1
echo argCount=%ARGCOUNT%> "%ARGCHECK_MARKER%"

REM Call Node with absolute path to handle spaces in Program Files
set "NODE_EXE=C:\Program Files\nodejs\node.exe"

REM Redirect child's stdout/stderr to files for post-mortem if n8n swallows output
set "STDOUT_LOG=%SCRIPT_DIR%wrapper_stdout.txt"
set "STDERR_LOG=%SCRIPT_DIR%wrapper_stderr.txt"

"%NODE_EXE%" "%SCRIPT_DIR%update-excel-wrapper.js" %* 1> "%STDOUT_LOG%" 2> "%STDERR_LOG%"
set "EXITCODE=%ERRORLEVEL%"

REM Write exit marker
set "CMD_EXIT_MARKER=%SCRIPT_DIR%cmd_exit_%EXITCODE%.marker"
echo finishedAt=%DATE% %TIME%> "%CMD_EXIT_MARKER%"
echo exitCode=%EXITCODE%>> "%CMD_EXIT_MARKER%"

exit /b %EXITCODE%

