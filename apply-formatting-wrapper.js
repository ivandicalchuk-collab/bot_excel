const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Получаем путь к файлу из аргументов
const filePath = process.argv[2];

if (!filePath) {
  console.error(JSON.stringify({
    error: 'Не указан путь к файлу',
    success: false
  }));
  process.exit(1);
}

// Нормализуем путь
const normalizedPath = filePath.replace(/\//g, '\\');

if (!fs.existsSync(normalizedPath)) {
  console.error(JSON.stringify({
    error: `Файл не найден: ${normalizedPath}`,
    success: false
  }));
  process.exit(1);
}

// Путь к основному скрипту
const scriptPath = path.join(__dirname, 'apply-formatting.js');

// Запускаем скрипт с таймаутом
const child = spawn('node', [scriptPath, normalizedPath], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
let isCompleted = false;

// Таймаут 30 секунд
const TIMEOUT = 30000;
const timeout = setTimeout(() => {
  if (!isCompleted) {
    isCompleted = true;
    child.kill();
    console.error(JSON.stringify({
      error: 'Таймаут выполнения скрипта',
      success: false,
      timeout: TIMEOUT
    }));
    process.exit(1);
  }
}, TIMEOUT);

child.stdout.on('data', (data) => {
  stdout += data.toString();
});

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

child.on('close', (code) => {
  clearTimeout(timeout);
  if (isCompleted) return;
  isCompleted = true;
  
  if (code === 0) {
    // Успешное выполнение
    if (stdout) {
      console.log(stdout);
    }
    process.exit(0);
  } else {
    // Ошибка
    const error = {
      error: 'Ошибка выполнения скрипта',
      success: false,
      exitCode: code,
      stderr: stderr,
      stdout: stdout
    };
    console.error(JSON.stringify(error));
    process.exit(code || 1);
  }
});

child.on('error', (error) => {
  clearTimeout(timeout);
  if (isCompleted) return;
  isCompleted = true;
  console.error(JSON.stringify({
    error: `Ошибка запуска скрипта: ${error.message}`,
    success: false
  }));
  process.exit(1);
});






