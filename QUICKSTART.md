# Быстрый старт

## Вариант 1: Простой workflow (рекомендуется для начала)

Этот вариант НЕ требует установки Puppeteer и работает быстрее.

### Шаги:
- Создай папку в которую прокинется в будущем папка с проектом bot_excel
- Скачай Git на сайте, выбрав 
Git for Windows/x64 Setup. (если еще не установлен): 
```
https://git-scm.com/install/windows
```
- Скачай и установи node.js, скачав на сайте, выбрав Windows Installer (.msi):
```
https://nodejs.org/en/download
```
- Запусти команду в этйо папке в терминале Powershell
```
git clone https://github.com/ivandicalchuk-collab/bot_excel.git
```
- Открой в курсоре папку и запусти терминал комбинацией клавиш CTRL+~

- Запусти команду на установку зависимостей:

```
npm install
```

- После установки зависимостей запусти команду на запуск n8n локально:
```
n8n start
```

- Зайди по адресу написанному в терминале или по дефолту на
```
http://localhost:5678
```
- Зарегистрируй локальный аккаунт, заполнив все необходимые поля

- Нажми Create workflow
- Нажми на три точки на холсте и выбери Import from File
- Выбери n8n_workflow_simple.json, который лежит в корне папки bot_excel
- На стартовом шаге Manual Trigger нажми отредактировать Output и добавь в объект переменную filePath  с путем до исходного файла, должно выглядеть примерно вот так:
```
[
  {
    "filePath": "C:/Users/ASUS/Desktop/bot_excel/calceulated_algoritm_tg_billing.xlsx"
  }
]
```
- Нажми Excute Workflow
- Посмотри новый файл с постфиксом _updated