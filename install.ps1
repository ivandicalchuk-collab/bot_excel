# Скрипт установки зависимостей для бота N8N

Write-Host "=== Установка зависимостей для бота N8N ===" -ForegroundColor Green

# Проверка Node.js
Write-Host "`nПроверка Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js установлен: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Node.js не установлен!" -ForegroundColor Red
    Write-Host "Пожалуйста, установите Node.js с https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "После установки Node.js перезапустите этот скрипт." -ForegroundColor Yellow
    exit 1
}

# Проверка npm
Write-Host "`nПроверка npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "npm установлен: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm не найден!" -ForegroundColor Red
    exit 1
}

# Установка Puppeteer (опционально, для варианта с браузером)
Write-Host "`nУстановка Puppeteer..." -ForegroundColor Yellow
npm install puppeteer
if ($LASTEXITCODE -eq 0) {
    Write-Host "Puppeteer установлен успешно!" -ForegroundColor Green
} else {
    Write-Host "Ошибка при установке Puppeteer" -ForegroundColor Red
}

# Проверка N8N
Write-Host "`nПроверка N8N..." -ForegroundColor Yellow
try {
    $n8nVersion = n8n --version
    Write-Host "N8N установлен: $n8nVersion" -ForegroundColor Green
} catch {
    Write-Host "N8N не установлен глобально." -ForegroundColor Yellow
    Write-Host "Установка N8N глобально..." -ForegroundColor Yellow
    npm install -g n8n
    if ($LASTEXITCODE -eq 0) {
        Write-Host "N8N установлен успешно!" -ForegroundColor Green
    } else {
        Write-Host "Ошибка при установке N8N. Попробуйте установить вручную: npm install -g n8n" -ForegroundColor Red
    }
}

Write-Host "`n=== Установка завершена ===" -ForegroundColor Green
Write-Host "`nСледующие шаги:" -ForegroundColor Yellow
Write-Host "1. Запустите N8N командой: n8n start" -ForegroundColor Cyan
Write-Host "2. Откройте браузер: http://localhost:5678" -ForegroundColor Cyan
Write-Host "3. Импортируйте workflow: n8n_workflow_simple.json" -ForegroundColor Cyan


