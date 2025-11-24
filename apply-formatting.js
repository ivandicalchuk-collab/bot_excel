const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Получаем путь к файлу из аргументов
const filePath = process.argv[2];

console.error('DEBUG: Script started');
console.error('DEBUG: Arguments:', process.argv);
console.error('DEBUG: File path from args:', filePath);

if (!filePath) {
  const error = {
    error: 'Не указан путь к файлу. Использование: node apply-formatting.js <file_path>',
    success: false,
    argv: process.argv
  };
  console.error(JSON.stringify(error));
  process.exit(1);
}

// Нормализуем путь для Windows
const normalizedPath = filePath.replace(/\//g, '\\');
console.error('DEBUG: Normalized path:', normalizedPath);
console.error('DEBUG: File exists:', fs.existsSync(normalizedPath));

if (!fs.existsSync(normalizedPath)) {
  const error = {
    error: `Файл не найден: ${normalizedPath}`,
    success: false,
    originalPath: filePath,
    normalizedPath: normalizedPath,
    currentDir: process.cwd()
  };
  console.error(JSON.stringify(error));
  process.exit(1);
}

try {
  console.error('DEBUG: Applying formatting to file:', normalizedPath);
  
  // Читаем Excel файл
  const workbook = XLSX.readFile(normalizedPath);
  const sheetName = 'Item';
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Лист '${sheetName}' не найден в файле`);
  }

  // Читаем заголовки напрямую из worksheet, чтобы не терять форматирование
  // Находим диапазон листа
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Читаем заголовки из первой строки
  const headerRow = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    headerRow.push(cell ? (cell.w || cell.v || '') : '');
  }

  // Функция для поиска столбцов по префиксу
  function findColumnIndexByPrefixes(row, prefixes) {
    for (let col = 0; col < row.length; col++) {
      const cell = String(row[col] ?? '').trim();
      if (!cell) continue;
      for (const prefix of prefixes) {
        if (cell.startsWith(prefix)) {
          return col;
        }
      }
    }
    return -1;
  }

  // Находим индексы столбцов для форматирования
  const dateTransferIndex = findColumnIndexByPrefixes(headerRow, ['Дата передачи']);
  const timeTransferIndex = findColumnIndexByPrefixes(headerRow, ['Время передачи']);
  const dateReturnIndex = findColumnIndexByPrefixes(headerRow, ['Дата возврата']);
  const timeReturnIndex = findColumnIndexByPrefixes(headerRow, ['Время возврата']);
  const dateTakingIndex = findColumnIndexByPrefixes(headerRow, ['Дата взятия тикета в работу сотрудником ЦКП']);
  const timeTakingWorkIndex = findColumnIndexByPrefixes(headerRow, ['Время взятия тикета в работу сотрудником ЦКП']);

  console.error('DEBUG: Column indexes for formatting:', {
    dateTransfer: dateTransferIndex,
    timeTransfer: timeTransferIndex,
    dateReturn: dateReturnIndex,
    timeReturn: timeReturnIndex,
    dateTaking: dateTakingIndex,
    timeTakingWork: timeTakingWorkIndex
  });

  // Функция для получения адреса ячейки
  const getCellAddress = (row, col) => {
    const colLetter = XLSX.utils.encode_col(col);
    return colLetter + (row + 1);
  };

  // Применяем форматирование ко всем строкам данных
  // Используем диапазон листа для итерации по строкам
  let formattedCellsCount = 0;
  for (let row = 1; row <= range.e.r; row++) {
    // Форматируем столбцы даты
    // ВАЖНО: Применяем только формат, сохраняя исходное значение ячейки
    if (dateTransferIndex !== -1) {
      const cellAddress = getCellAddress(row, dateTransferIndex);
      const cell = worksheet[cellAddress];
      if (cell) {
        // Сохраняем исходное значение и тип
        const originalValue = cell.v;
        const originalType = cell.t;
        // Применяем только формат даты
        cell.z = 'dd.mm.yyyy';
        // Восстанавливаем исходное значение и тип, если они были
        if (originalValue !== undefined) {
          cell.v = originalValue;
        }
        if (originalType !== undefined) {
          cell.t = originalType;
        }
        formattedCellsCount++;
      }
    }
    if (dateReturnIndex !== -1) {
      const cellAddress = getCellAddress(row, dateReturnIndex);
      const cell = worksheet[cellAddress];
      if (cell) {
        const originalValue = cell.v;
        const originalType = cell.t;
        cell.z = 'dd.mm.yyyy';
        if (originalValue !== undefined) {
          cell.v = originalValue;
        }
        if (originalType !== undefined) {
          cell.t = originalType;
        }
        formattedCellsCount++;
      }
    }
    if (dateTakingIndex !== -1) {
      const cellAddress = getCellAddress(row, dateTakingIndex);
      const cell = worksheet[cellAddress];
      if (cell) {
        const originalValue = cell.v;
        const originalType = cell.t;
        cell.z = 'dd.mm.yyyy';
        if (originalValue !== undefined) {
          cell.v = originalValue;
        }
        if (originalType !== undefined) {
          cell.t = originalType;
        }
        formattedCellsCount++;
      }
    }

    // Форматируем столбцы времени
    if (timeTransferIndex !== -1) {
      const cellAddress = getCellAddress(row, timeTransferIndex);
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].z = 'hh:mm';
        worksheet[cellAddress].t = 'n';
        formattedCellsCount++;
      }
    }
    if (timeReturnIndex !== -1) {
      const cellAddress = getCellAddress(row, timeReturnIndex);
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].z = 'hh:mm';
        worksheet[cellAddress].t = 'n';
        formattedCellsCount++;
      }
    }
    if (timeTakingWorkIndex !== -1) {
      const cellAddress = getCellAddress(row, timeTakingWorkIndex);
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].z = 'hh:mm';
        worksheet[cellAddress].t = 'n';
        formattedCellsCount++;
      }
    }
  }

  console.error(`DEBUG: Applied formatting to ${formattedCellsCount} cells`);

  // Сохраняем файл с форматированием
  XLSX.writeFile(workbook, normalizedPath);
  console.error('DEBUG: File saved with formatting');

  const result = {
    success: true,
    filePath: normalizedPath,
    formattedCells: formattedCellsCount,
    message: `Форматирование применено к ${formattedCellsCount} ячейкам`
  };

  // Выводим результат в stdout для n8n
  console.log(JSON.stringify(result));
  // Завершаем процесс успешно
  process.exit(0);
} catch (error) {
  const errorResult = {
    error: error.message,
    success: false,
    stack: error.stack,
    filePath: normalizedPath || filePath
  };
  console.error(JSON.stringify(errorResult));
  // Завершаем процесс с ошибкой
  process.exit(1);
}

