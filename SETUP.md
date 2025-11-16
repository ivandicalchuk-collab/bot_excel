# Инструкция по развертыванию проекта

## Шаг 1: Установка Node.js

Если Node.js не установлен:

1. Скачайте Node.js с официального сайта: https://nodejs.org/
2. Выберите LTS версию (рекомендуется)
3. Установите, следуя инструкциям установщика
4. Перезапустите терминал/PowerShell

Проверка установки:
```powershell
node --version
npm --version
```

## Шаг 2: Установка зависимостей проекта

Выполните один из вариантов:

### Вариант А: Автоматическая установка
```powershell
.\install.ps1
```

### Вариант Б: Ручная установка

Если нужен вариант с Puppeteer (для работы с сайтом planetcalc.ru):
```powershell
npm install puppeteer
```

Если используете простой вариант (без Puppeteer), зависимости не требуются.

## Шаг 3: Установка N8N

### Вариант А: Глобальная установка (рекомендуется)
```powershell
npm install -g n8n
```

### Вариант Б: Локальная установка
```powershell
npm install n8n
```

## Шаг 4: Запуск N8N

### Вариант А: Используя скрипт
```powershell
.\start-n8n.ps1
```

### Вариант Б: Вручную
```powershell
n8n start
```

N8N будет доступен по адресу: **http://localhost:5678**

## Шаг 5: Импорт workflow в N8N

1. Откройте браузер и перейдите на http://localhost:5678
2. Нажмите на меню (три точки в правом верхнем углу)
3. Выберите **"Import from File"**
4. Выберите один из файлов:
   - **n8n_workflow_simple.json** (рекомендуется для начала, не требует Puppeteer)
   - **n8n_workflow_puppeteer.json** (если нужен сайт planetcalc.ru)

## Шаг 6: Настройка путей в workflow

После импорта workflow:

1. Откройте узел **"Read Excel File"**
2. Проверьте путь к файлу: `C:\Users\ASUS\Desktop\bot_excel\calceulated_algoritm_tg_billing.xlsx`
   - Если файл в другом месте, измените путь
3. Откройте узел **"Update Excel File"**
4. Проверьте тот же путь

**Для варианта с Puppeteer дополнительно:**
- В узлах **"Prepare First Calculation"** и **"Prepare Second Calculation"** проверьте путь `projectPath`
- В узлах **"Calculate First Time (Puppeteer)"** и **"Calculate Second Time (Puppeteer)"** проверьте путь `cwd`

## Шаг 7: Запуск workflow

1. Убедитесь, что Excel файл **закрыт**
2. В N8N нажмите кнопку **"Execute Workflow"** (или используйте триггер)
3. Дождитесь завершения выполнения
4. Проверьте результаты в Excel файле

## Альтернативный способ: N8N Desktop App

Если у вас установлен N8N Desktop App:

1. Откройте N8N Desktop
2. File → Import from File
3. Выберите `n8n_workflow_simple.json` или `n8n_workflow_puppeteer.json`
4. Настройте пути и запустите

## Устранение проблем

### Ошибка "node не является внутренней или внешней командой"
- Установите Node.js с https://nodejs.org/
- Перезапустите терминал после установки

### Ошибка при установке Puppeteer
- Убедитесь, что у вас есть права администратора
- Попробуйте: `npm install puppeteer --legacy-peer-deps`

### N8N не запускается
- Проверьте, что порт 5678 свободен
- Попробуйте запустить с другим портом: `n8n start --port 5679`

### Ошибка при чтении Excel
- Убедитесь, что файл закрыт
- Проверьте правильность пути к файлу
- Убедитесь, что лист называется "лист 1"


