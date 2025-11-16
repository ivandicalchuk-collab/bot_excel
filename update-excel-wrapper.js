const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Получаем данные из аргументов
// Аргументы могут быть переданы по-разному из-за особенностей n8n
// Пробуем определить правильный порядок
const inputFile = process.argv[2];
let outputFile = '';
let updatesBase64 = '';

// Проверяем, что во втором аргументе (индекс 3)
// Если это выглядит как base64 (длинная строка с символами base64), то это updatesBase64
// Если это пустая строка или путь, то это outputFile
if (process.argv[3]) {
  const arg3 = process.argv[3];
  // Если аргумент 3 похож на base64 (длинный, содержит base64 символы), то это base64
  if (arg3.length > 100 && /^[A-Za-z0-9+/=]+$/.test(arg3)) {
    updatesBase64 = arg3;
    outputFile = process.argv[4] || '';
  } else {
    outputFile = arg3;
    updatesBase64 = process.argv[4] || '';
  }
} else {
  updatesBase64 = process.argv[4] || '';
}

// Отладка с самого начала
console.error('=== WRAPPER START ===');
console.error('DEBUG: process.argv count:', process.argv.length);
console.error('DEBUG: process.argv:', process.argv);
console.error('DEBUG: inputFile:', inputFile);
console.error('DEBUG: outputFile:', outputFile);
console.error('DEBUG: updatesBase64 length:', updatesBase64 ? updatesBase64.length : 0);
console.error('DEBUG: updatesBase64 preview:', updatesBase64 ? updatesBase64.substring(0, 100) + '...' : 'null');

if (!inputFile || !updatesBase64) {
  console.error(JSON.stringify({
    error: 'Недостаточно аргументов',
    success: false,
    received: {
      inputFile: inputFile,
      outputFile: outputFile,
      hasUpdatesBase64: !!updatesBase64,
      argCount: process.argv.length
    }
  }));
  process.exit(1);
}

// Нормализуем пути для Windows
const normalizedInput = inputFile.replace(/\//g, '\\');
let normalizedOutput = outputFile.replace(/\//g, '\\');
const inputDir = path.dirname(normalizedInput);

console.error('DEBUG: Input directory:', inputDir);
console.error('DEBUG: Input directory exists:', fs.existsSync(inputDir));

// Создаем временный файл для base64 данных (избегаем проблем с длинной командной строкой)
// Используем папку temp рядом с проектом
const tempDir = path.join(inputDir, 'temp');
console.error('DEBUG: Temp directory:', tempDir);

try {
  if (!fs.existsSync(tempDir)) {
    console.error('DEBUG: Creating temp directory...');
    fs.mkdirSync(tempDir, { recursive: true });
    console.error('DEBUG: Temp directory created');
  } else {
    console.error('DEBUG: Temp directory already exists');
  }
} catch (mkdirError) {
  console.error('DEBUG: Error creating temp directory:', mkdirError.message);
  // Пробуем использовать системную временную папку
  const os = require('os');
  const systemTempDir = os.tmpdir();
  console.error('DEBUG: Trying system temp directory:', systemTempDir);
  // Используем системную папку если не удалось создать локальную
}

const tempFile = path.join(tempDir, `updates-${Date.now()}.txt`);
console.error('DEBUG: Temp file path:', tempFile);

// Управление очисткой временных файлов через переменную окружения
const KEEP_TEMP = process.env.KEEP_TEMP === '1';
if (KEEP_TEMP) {
  console.error('DEBUG: KEEP_TEMP=1 → временные файлы не будут удаляться');
}

try {
  console.error('DEBUG: Writing base64 to temp file...');
  // Записываем base64 в временный файл
  fs.writeFileSync(tempFile, updatesBase64, 'utf8');
  console.error('DEBUG: Base64 written to temp file successfully, size:', fs.statSync(tempFile).size, 'bytes');
  
  // Запускаем основной скрипт с путем к временному файлу
  const scriptPath = path.join(__dirname, 'update-excel.js');
  // Не переопределяем normalizedOutput, используем отдельную переменную
  const outputArg = outputFile || '';
  const args = [scriptPath, normalizedInput, outputArg, tempFile];
  
  console.error('DEBUG: Script path:', scriptPath);
  console.error('DEBUG: Script exists:', fs.existsSync(scriptPath));
  console.error('DEBUG: Working directory:', path.dirname(normalizedInput));
  console.error('DEBUG: Command: node', args.join(' '));
  
  // Таймаут для предотвращения зависания
  const TIMEOUT = 60000; // 60 секунд
  let isCompleted = false;
  
  const child = spawn('node', args, {
    cwd: path.dirname(normalizedInput),
    stdio: ['inherit', 'inherit', 'inherit'] // Все потоки наследуются
  });
  
  // Таймаут для процесса
  const timeout = setTimeout(() => {
    if (!isCompleted) {
      console.error('DEBUG: Process timeout after', TIMEOUT / 1000, 'seconds');
      child.kill('SIGTERM');
      try {
        if (!KEEP_TEMP) {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
          // Пытаемся удалить пустую временную директорию
          try {
            const files = fs.readdirSync(tempDir);
            if (files.length === 0) {
              fs.rmdirSync(tempDir);
              console.error('DEBUG: Temp directory removed (empty):', tempDir);
            }
          } catch (_) {}
        } else {
          console.error('DEBUG: KEEP_TEMP=1 → пропускаем удаление temp файла/директории (timeout)');
        }
      } catch (err) {
        // Игнорируем ошибки удаления
      }
      process.exit(124); // Код выхода для timeout
    }
  }, TIMEOUT);
  
  // Обработка завершения процесса
  child.on('close', (code, signal) => {
    isCompleted = true;
    clearTimeout(timeout);
    
    console.error('DEBUG: Process closed, code:', code, 'signal:', signal);
    
    // Удаляем временный файл
    try {
      if (!KEEP_TEMP) {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.error('DEBUG: Temp file deleted:', tempFile);
        }
        // Пытаемся удалить пустую временную директорию
        try {
          const files = fs.readdirSync(tempDir);
          if (files.length === 0) {
            fs.rmdirSync(tempDir);
            console.error('DEBUG: Temp directory removed (empty):', tempDir);
          } else {
            console.error('DEBUG: Temp directory not empty, remaining files:', files);
          }
        } catch (dirErr) {
          console.error('DEBUG: Error checking/removing temp directory:', dirErr.message);
        }
      } else {
        console.error('DEBUG: KEEP_TEMP=1 → пропускаем удаление temp файла/директории (close)');
      }
    } catch (err) {
      console.error('DEBUG: Error deleting temp file:', err.message);
    }
    
    console.error('=== WRAPPER END ===');
    process.exit(code || 0);
  });
  
  child.on('error', (error) => {
    isCompleted = true;
    clearTimeout(timeout);
    
    console.error('DEBUG: Script spawn error:', error.message);
    console.error('DEBUG: Error stack:', error.stack);
    
    // Удаляем временный файл
    try {
      if (!KEEP_TEMP) {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } else {
        console.error('DEBUG: KEEP_TEMP=1 → пропускаем удаление temp файла/директории (error)');
      }
    } catch (err) {
      // Игнорируем ошибки удаления
    }
    
    console.error('=== WRAPPER END (ERROR) ===');
    process.exit(1);
  });
  
  // Логирование начала процесса
  console.error('DEBUG: Process spawned, PID:', child.pid);
  
} catch (error) {
  console.error(JSON.stringify({
    error: `Ошибка создания временного файла: ${error.message}`,
    success: false,
    stack: error.stack
  }));
  
  // Пытаемся удалить временный файл
  try {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  } catch (err) {
    // Игнорируем ошибки удаления
  }
  
  process.exit(1);
}

