<# ASCII-only n8n start script with allowlist #>

Write-Host "=== Starting n8n ==="

# Set allowlist for Execute Command
$env:N8N_EXECUTE_COMMAND_ALLOWLIST = "C:\Windows\System32\cmd.exe,C:\projects\bot_excel\run-wrapper.cmd,C:\Program Files\nodejs\node.exe"
Write-Host ("N8N_EXECUTE_COMMAND_ALLOWLIST=" + $env:N8N_EXECUTE_COMMAND_ALLOWLIST)

# Try to show n8n version (optional)
try {
  $ver = n8n --version
  Write-Host ("n8n found: " + $ver)
} catch {
  Write-Host "n8n not found in PATH. If installed via npm -g, ensure PATH is set."
}

Write-Host "Starting n8n on http://localhost:5678 (Ctrl+C to stop)"

n8n start



