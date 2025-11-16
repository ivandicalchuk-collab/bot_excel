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
const inputExt = path.extname(normalizedInput);
const inputBase = path.basename(normalizedInput, inputExt);
const debugReportFileName = `${inputBase || 'wrapper'}_wrapper_run.json`;
const debugReportPathPrimary = path.join(inputDir || process.cwd(), debugReportFileName);
const debugReportPathFallbackCwd = path.join(process.cwd(), debugReportFileName);
const debugReportPathFallbackScript = path.join(__dirname, debugReportFileName);
const startMarkerFileName = `${inputBase || 'wrapper'}_started.marker`;
const startMarkerPathPrimary = path.join(inputDir || process.cwd(), startMarkerFileName);
const startMarkerPathFallbackCwd = path.join(process.cwd(), startMarkerFileName);
const startMarkerPathFallbackScript = path.join(__dirname, startMarkerFileName);

// Внутренний отчет/диагностика, который мы сохраним в файл всегда
const debugReport = {
  startedAt: new Date().toISOString(),
  inputFile: normalizedInput,
  outputArg: normalizedOutput,
  workingDir: inputDir,
  base64Length: updatesBase64 ? updatesBase64.length : 0,
  tempDir: null,
  tempFile: null,
  child: {
    pid: null,
    exitCode: null,
    signal: null,
    stdoutLength: 0,
    stderrLength: 0
  },
  stages: [],
  error: null
};

function tryWriteReport(where) {
  try {
    fs.writeFileSync(where, JSON.stringify(debugReport, null, 2), 'utf8');
    console.error('DEBUG: Wrapper report written to:', where);
    return true;
  } catch (e) {
    console.error('DEBUG: Failed to write wrapper report to', where, ':', e.message);
    return false;
  }
}

function writeReportWithFallbacks() {
  if (tryWriteReport(debugReportPathPrimary)) return;
  if (tryWriteReport(debugReportPathFallbackCwd)) return;
  tryWriteReport(debugReportPathFallbackScript);
}

function tryWriteMarker(where) {
  try {
    const content = [
      `startedAt=${new Date().toISOString()}`,
      `pid=${process.pid}`,
      `inputFile=${normalizedInput}`,
      `outputArg=${normalizedOutput}`
    ].join('\n');
    fs.writeFileSync(where, content, 'utf8');
    console.error('DEBUG: Start marker written to:', where);
    return true;
  } catch (e) {
    console.error('DEBUG: Failed to write start marker to', where, ':', e.message);
    return false;
  }
}

function writeMarkerWithFallbacks() {
  if (tryWriteMarker(startMarkerPathPrimary)) return;
  if (tryWriteMarker(startMarkerPathFallbackCwd)) return;
  tryWriteMarker(startMarkerPathFallbackScript);
}

console.error('DEBUG: Input directory:', inputDir);
console.error('DEBUG: Input directory exists:', fs.existsSync(inputDir));
// Пишем маркер старта сразу
writeMarkerWithFallbacks();

// Создаем временный файл для base64 данных (избегаем проблем с длинной командной строкой)
// Используем папку temp рядом с проектом
const tempDir = path.join(inputDir, 'temp');
console.error('DEBUG: Temp directory:', tempDir);
debugReport.tempDir = tempDir;

try {
  if (!fs.existsSync(tempDir)) {
    console.error('DEBUG: Creating temp directory...');
    fs.mkdirSync(tempDir, { recursive: true });
    console.error('DEBUG: Temp directory created');
    debugReport.stages.push('temp_dir_created');
  } else {
    console.error('DEBUG: Temp directory already exists');
    debugReport.stages.push('temp_dir_exists');
  }
} catch (mkdirError) {
  console.error('DEBUG: Error creating temp directory:', mkdirError.message);
  // Пробуем использовать системную временную папку
  const os = require('os');
  const systemTempDir = os.tmpdir();
  console.error('DEBUG: Trying system temp directory:', systemTempDir);
  // Используем системную папку если не удалось создать локальную
  debugReport.error = `mkdir_failed: ${mkdirError.message}`;
}

const tempFile = path.join(tempDir, `updates-${Date.now()}.txt`);
console.error('DEBUG: Temp file path:', tempFile);
debugReport.tempFile = tempFile;

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
  debugReport.stages.push('temp_file_written');
  
  // Запускаем основной скрипт с путем к временному файлу
  const scriptPath = path.join(__dirname, 'update-excel.js');
  // Не переопределяем normalizedOutput, используем отдельную переменную
  const outputArg = outputFile || '';
  const args = [scriptPath, normalizedInput, outputArg, tempFile];
  
  console.error('DEBUG: Script path:', scriptPath);
  console.error('DEBUG: Script exists:', fs.existsSync(scriptPath));
  console.error('DEBUG: Working directory:', path.dirname(normalizedInput));
  console.error('DEBUG: Command: node', args.join(' '));
  debugReport.stages.push('child_spawn_prepare');
  
  // Таймаут для предотвращения зависания
  const TIMEOUT = 120000; // 120 секунд
  let isCompleted = false;
  let childStdout = '';
  let childStderr = '';
  
  const child = spawn('node', args, {
    cwd: path.dirname(normalizedInput),
    stdio: ['ignore', 'pipe', 'pipe'] // Захватываем вывод для последующей передачи наружу
  });
  debugReport.child.pid = child.pid || null;

  // Захват stdout/stderr дочернего процесса
  if (child.stdout) {
    child.stdout.on('data', (data) => {
      const text = data.toString();
      childStdout += text;
      debugReport.child.stdoutLength = childStdout.length;
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => {
      const text = data.toString();
      childStderr += text;
      debugReport.child.stderrLength = childStderr.length;
      // Дублируем в stderr обертки для видимости в логах
      try { process.stderr.write(text); } catch (_) {}
    });
  }
  
  // Таймаут для процесса
  const timeout = setTimeout(() => {
    if (!isCompleted) {
      console.error('DEBUG: Process timeout after', TIMEOUT / 1000, 'seconds');
      debugReport.stages.push('timeout_fired');
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
              debugReport.stages.push('temp_dir_removed_timeout');
            }
          } catch (_) {}
        } else {
          console.error('DEBUG: KEEP_TEMP=1 → пропускаем удаление temp файла/директории (timeout)');
          debugReport.stages.push('temp_kept_timeout');
        }
      } catch (err) {
        // Игнорируем ошибки удаления
      }
      // Пишем отчет в файл даже при таймауте
      writeReportWithFallbacks();
      process.exit(124); // Код выхода для timeout
    }
  }, TIMEOUT);
  
  // Обработка завершения процесса
  child.on('close', (code, signal) => {
    isCompleted = true;
    clearTimeout(timeout);
    
    console.error('DEBUG: Process closed, code:', code, 'signal:', signal);
    console.error('DEBUG: Child stdout length:', childStdout.length);
    console.error('DEBUG: Child stderr length:', childStderr.length);
    debugReport.child.exitCode = code;
    debugReport.child.signal = signal || null;
    debugReport.stages.push('child_closed');

    // Пробуем отдать наружу stdout дочернего процесса, чтобы n8n мог его распарсить
    try {
      if (childStdout && childStdout.trim().length > 0) {
        process.stdout.write(childStdout);
      } else if (code !== 0) {
        // Если ошибки и нет stdout — вернем диагностический JSON
        const diagnostic = {
          success: false,
          error: 'Child process failed without stdout',
          exitCode: code,
          stderrPreview: childStderr.substring(0, 1000)
        };
        process.stdout.write(JSON.stringify(diagnostic) + '\n');
        debugReport.error = diagnostic.error;
      }
    } catch (e) {
      // Игнорируем
    }
    
    // Удаляем временный файл
    try {
      if (!KEEP_TEMP) {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
          console.error('DEBUG: Temp file deleted:', tempFile);
          debugReport.stages.push('temp_file_deleted');
        }
        // Пытаемся удалить пустую временную директорию
        try {
          const files = fs.readdirSync(tempDir);
          if (files.length === 0) {
            fs.rmdirSync(tempDir);
            console.error('DEBUG: Temp directory removed (empty):', tempDir);
            debugReport.stages.push('temp_dir_removed_close');
          } else {
            console.error('DEBUG: Temp directory not empty, remaining files:', files);
            debugReport.stages.push('temp_dir_not_empty_close');
          }
        } catch (dirErr) {
          console.error('DEBUG: Error checking/removing temp directory:', dirErr.message);
          debugReport.error = debugReport.error || `temp_dir_cleanup_error: ${dirErr.message}`;
        }
      } else {
        console.error('DEBUG: KEEP_TEMP=1 → пропускаем удаление temp файла/директории (close)');
        debugReport.stages.push('temp_kept_close');
      }
    } catch (err) {
      console.error('DEBUG: Error deleting temp file:', err.message);
       debugReport.error = debugReport.error || `temp_delete_error: ${err.message}`;
    }
    
    console.error('=== WRAPPER END ===');
    // Сохраняем отчет
    writeReportWithFallbacks();
    process.exit(code || 0);
  });
  
  child.on('error', (error) => {
    isCompleted = true;
    clearTimeout(timeout);
    
    console.error('DEBUG: Script spawn error:', error.message);
    console.error('DEBUG: Error stack:', error.stack);
    debugReport.error = `spawn_error: ${error.message}`;
    debugReport.stages.push('child_spawn_error');
    
    // Удаляем временный файл
    try {
      if (!KEEP_TEMP) {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } else {
        console.error('DEBUG: KEEP_TEMP=1 → пропускаем удаление temp файла/директории (error)');
        debugReport.stages.push('temp_kept_error');
      }
    } catch (err) {
      // Игнорируем ошибки удаления
    }
    
    console.error('=== WRAPPER END (ERROR) ===');
    // Сохраняем отчет
    writeReportWithFallbacks();
    process.exit(1);
  });
  
  // Логирование начала процесса
  console.error('DEBUG: Process spawned, PID:', child.pid);
  debugReport.stages.push('child_spawned');
  
} catch (error) {
  console.error(JSON.stringify({
    error: `Ошибка создания временного файла: ${error.message}`,
    success: false,
    stack: error.stack
  }));
  debugReport.error = `outer_try_catch_error: ${error.message}`;
  
  // Пытаемся удалить временный файл
  try {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  } catch (err) {
    // Игнорируем ошибки удаления
  }

  // Сохраняем отчет даже при падении
  writeReportWithFallbacks();
  
  process.exit(1);
}

