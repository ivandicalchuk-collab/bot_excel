# Быстрый старт

## Вариант 1: Простой workflow (рекомендуется для начала)

Этот вариант НЕ требует установки Puppeteer и работает быстрее.

### Шаги:

1. **Импортируйте workflow в N8N:**
   - Откройте N8N (http://localhost:5678)
   - Меню → Import from File
   - Выберите `n8n_workflow_simple.json`

2. **Проверьте пути к Excel файлу:**
   - Откройте узел "Read Excel File"
   - Убедитесь, что путь правильный: `C:\Users\ASUS\Desktop\bot_excel\calceulated_algoritm_tg_billing.xlsx`
   - То же самое в узле "Update Excel File"

3. **Запустите workflow:**
   - Нажмите "Execute Workflow"
   - Дождитесь завершения
   - Проверьте результаты в Excel

## Вариант 2: Workflow с Puppeteer (использует сайт planetcalc.ru)

Этот вариант требует установки Puppeteer и реально взаимодействует с сайтом.

### Шаги:

1. **Установите зависимости:**
   ```bash
   cd C:\Users\ASUS\Desktop\bot_excel
   npm install puppeteer
   ```

2. **Импортируйте workflow в N8N:**
   - Откройте N8N (http://localhost:5678)
   - Меню → Import from File
   - Выберите `n8n_workflow_puppeteer.json`

3. **Проверьте пути:**
   - В узлах "Read Excel File" и "Update Excel File" проверьте путь к Excel файлу
   - В узлах "Prepare First Calculation" и "Prepare Second Calculation" проверьте путь `projectPath`
   - В узлах "Calculate First Time (Puppeteer)" и "Calculate Second Time (Puppeteer)" проверьте путь `cwd`

4. **Запустите workflow:**
   - Нажмите "Execute Workflow"
   - Дождитесь завершения
   - Проверьте результаты в Excel

## Важно!

- Убедитесь, что Excel файл **закрыт** перед запуском workflow
- Первая строка Excel должна содержать заголовки столбцов
- Данные начинаются со второй строки

## Формат данных в Excel

Убедитесь, что в Excel файле есть следующие столбцы:
- № Тикета
- Дата передачи
- Время передачи
- Дата возврата
- Время возврата
- Дата взятия тикета в работу сотрудником ЦКП
- Время взятия тикета в работу сотрудником ЦКП

Результаты будут записаны в:
- Время обработки
- Время с момента передачи тикета до взятия его обратно в работу сотрудниками ЦКП


