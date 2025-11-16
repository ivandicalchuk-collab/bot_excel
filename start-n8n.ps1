# Скрипт запуска N8N

Write-Host "=== Запуск N8N ===" -ForegroundColor Green

# Проверка N8N
try {
    $n8nVersion = n8n --version
    Write-Host "N8N найден: $n8nVersion" -ForegroundColor Green
} catch {
    Write-Host "N8N не найден! Установите его командой: npm install -g n8n" -ForegroundColor Red
    Write-Host "Или запустите скрипт install.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nЗапуск N8N..." -ForegroundColor Yellow
Write-Host "N8N будет доступен по адресу: http://localhost:5678" -ForegroundColor Cyan
Write-Host "Для остановки нажмите Ctrl+C`n" -ForegroundColor Yellow

# Запуск N8N
n8n start


