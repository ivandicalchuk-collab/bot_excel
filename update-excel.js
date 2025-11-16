const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Получаем данные из аргументов
const inputFile = process.argv[2];
const outputFile = process.argv[3] || inputFile;
const updatesData = process.argv[4];

if (!inputFile || !updatesData) {
  console.error(JSON.stringify({ 
    error: 'Недостаточно аргументов. Использование: node update-excel.js <input_file> [output_file] <updates_base64>',
    success: false 
  }));
  process.exit(1);
}

// Декодируем обновления из base64
let updates;
try {
  // Пробуем декодировать base64
  try {
    const decoded = Buffer.from(updatesData, 'base64').toString('utf8');
    updates = JSON.parse(decoded);
  } catch (base64Error) {
    // Если не base64, пробуем как JSON строку напрямую
    try {
      updates = JSON.parse(updatesData);
    } catch (jsonError) {
      // Если и это не сработало, пробуем как путь к файлу
      try {
        const updatesContent = fs.readFileSync(updatesData, 'utf8');
        updates = JSON.parse(updatesContent);
      } catch (fileError) {
        throw new Error('Не удалось распарсить данные обновлений');
      }
    }
  }
} catch (error) {
  console.error(JSON.stringify({
    error: `Ошибка обработки данных обновлений: ${error.message}`,
    success: false
  }));
  process.exit(1);
}

try {
  // Читаем существующий Excel файл
  const workbook = XLSX.readFile(inputFile);
  const sheetName = 'Item';
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error(`Лист '${sheetName}' не найден в файле`);
  }

  // Преобразуем лист в JSON для удобной работы
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  // Обновления уже загружены

  // Находим индексы столбцов
  const headerRow = jsonData[0];
  const ticketIndex = headerRow.indexOf('№ Тикета');
  const timeProcessingIndex = headerRow.indexOf('Время обработки');
  const timeTakingIndex = headerRow.indexOf('Время с момента передачи тикета до взятия его обратно в работу сотрудниками ЦКП');

  if (ticketIndex === -1) {
    throw new Error('Столбец "№ Тикета" не найден');
  }

  // Создаем карту обновлений по номеру тикета
  // Сохраняем и как строку, и как число для надежности
  const updatesMap = new Map();
  for (const item of updates) {
    const ticketNumber = item['№ Тикета'];
    if (ticketNumber !== null && ticketNumber !== undefined && ticketNumber !== '') {
      const ticketStr = String(ticketNumber).trim();
      const updateData = {
        timeProcessing: item['Время обработки'] || '',
        timeTaking: item['Время с момента передачи тикета до взятия его обратно в работу сотрудниками ЦКП'] || ''
      };
      // Сохраняем как строку
      updatesMap.set(ticketStr, updateData);
      // Также сохраняем как число, если это число
      if (!isNaN(Number(ticketStr))) {
        updatesMap.set(String(Number(ticketStr)), updateData);
      }
    }
  }

  // Обновляем данные в листе
  let updatedCount = 0;
  const notFoundTickets = [];
  
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    // Пробуем разные варианты сравнения номера тикета
    const ticketNumber = String(row[ticketIndex] || '').trim();
    const ticketNumberNum = isNaN(Number(ticketNumber)) ? null : String(Number(ticketNumber));

    let updateData = null;
    if (updatesMap.has(ticketNumber)) {
      updateData = updatesMap.get(ticketNumber);
    } else if (ticketNumberNum && updatesMap.has(ticketNumberNum)) {
      updateData = updatesMap.get(ticketNumberNum);
    }

    if (updateData) {
      if (timeProcessingIndex !== -1) {
        // Убеждаемся, что столбец существует
        while (row.length <= timeProcessingIndex) {
          row.push('');
        }
        row[timeProcessingIndex] = updateData.timeProcessing;
      }
      if (timeTakingIndex !== -1) {
        while (row.length <= timeTakingIndex) {
          row.push('');
        }
        row[timeTakingIndex] = updateData.timeTaking;
      }
      updatedCount++;
    }
  }

  // Проверяем, все ли тикеты были найдены
  for (const [ticket, data] of updatesMap.entries()) {
    let found = false;
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowTicket = String(row[ticketIndex] || '').trim();
      const rowTicketNum = isNaN(Number(rowTicket)) ? null : String(Number(rowTicket));
      if (rowTicket === ticket || rowTicketNum === ticket) {
        found = true;
        break;
      }
    }
    if (!found) {
      notFoundTickets.push(ticket);
    }
  }

  // Преобразуем обратно в лист
  const updatedWorksheet = XLSX.utils.aoa_to_sheet(jsonData);
  workbook.Sheets[sheetName] = updatedWorksheet;

  // Записываем обновленный файл
  XLSX.writeFile(workbook, outputFile);

  const message = `Файл успешно обновлен. Обновлено строк: ${updatedCount} из ${updates.length}`;
  const result = {
    success: true,
    updatedRows: updatedCount,
    totalUpdates: updates.length,
    message: message
  };
  
  if (notFoundTickets.length > 0) {
    result.warning = `Не найдены тикеты в файле: ${notFoundTickets.join(', ')}`;
  }
  
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(JSON.stringify({
    error: error.message,
    success: false
  }));
  process.exit(1);
}

