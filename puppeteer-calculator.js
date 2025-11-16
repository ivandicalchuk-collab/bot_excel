const puppeteer = require('puppeteer');
const fs = require('fs');

// Получаем данные из аргументов командной строки (base64) или файла
let inputData;
try {
  const arg = process.argv[2];
  
  if (arg) {
    // Пробуем декодировать base64
    try {
      const decoded = Buffer.from(arg, 'base64').toString('utf8');
      inputData = JSON.parse(decoded);
    } catch (base64Error) {
      // Если не base64, пробуем как путь к файлу
      try {
        const dataContent = fs.readFileSync(arg, 'utf8');
        inputData = JSON.parse(dataContent);
      } catch (fileError) {
        // Если и файл не найден, пробуем как JSON строку напрямую
        try {
          inputData = JSON.parse(arg);
        } catch (jsonError) {
          throw new Error('Не удалось распарсить входные данные');
        }
      }
    }
  } else {
    // Если аргументов нет, пробуем получить из stdin
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      input += chunk;
    });
    process.stdin.on('end', () => {
      if (input) {
        try {
          inputData = JSON.parse(input.trim());
          runCalculation();
        } catch (e) {
          console.error(JSON.stringify({ error: 'Ошибка парсинга данных из stdin: ' + e.message, success: false }));
          process.exit(1);
        }
      } else {
        console.error(JSON.stringify({ error: 'Нет входных данных', success: false }));
        process.exit(1);
      }
    });
    return;
  }
  
  // Если данные получены из аргументов, запускаем расчет
  if (inputData) {
    runCalculation();
  }
} catch (error) {
  console.error(JSON.stringify({ error: 'Не удалось получить входные данные: ' + error.message, success: false }));
  process.exit(1);
}

async function calculateTimeDifference(date1, time1, date2, time2) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Переходим на сайт калькулятора
    await page.goto('https://planetcalc.ru/4309/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Формируем дату в формате для input[type="datetime-local"]
    // Формат: YYYY-MM-DDTHH:mm
    function formatDateTime(dateStr, timeStr) {
      // Преобразуем дату в формат YYYY-MM-DD
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Время уже должно быть в формате HH:mm
      const time = timeStr.length === 5 ? timeStr : timeStr.substring(0, 5);
      
      return `${year}-${month}-${day}T${time}`;
    }
    
    const datetime1 = formatDateTime(date1, time1);
    const datetime2 = formatDateTime(date2, time2);
    
    // Ждем загрузки страницы и ищем поля ввода
    await page.waitForTimeout(2000);
    
    // Ищем все input поля
    const inputs = await page.$$('input');
    let dateInput1 = null;
    let dateInput2 = null;
    
    // Ищем поля datetime-local или text
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await page.evaluate(el => el.type, input);
      const name = await page.evaluate(el => el.name || el.id || '', input);
      
      if (type === 'datetime-local' || type === 'text') {
        if (!dateInput1) {
          dateInput1 = input;
        } else if (!dateInput2) {
          dateInput2 = input;
          break;
        }
      }
    }
    
    if (!dateInput1 || !dateInput2) {
      // Альтернативный метод: ищем по позиции
      const allInputs = await page.$$('input[type="text"], input[type="datetime-local"]');
      if (allInputs.length >= 2) {
        dateInput1 = allInputs[0];
        dateInput2 = allInputs[1];
      }
    }
    
    if (dateInput1 && dateInput2) {
      // Очищаем поля и вводим значения
      await dateInput1.click({ clickCount: 3 });
      await dateInput1.type(datetime1, { delay: 50 });
      
      await page.waitForTimeout(500);
      
      await dateInput2.click({ clickCount: 3 });
      await dateInput2.type(datetime2, { delay: 50 });
      
      // Ждем расчета
      await page.waitForTimeout(2000);
      
      // Ищем результат на странице
      let result = '';
      
      // Пробуем разные селекторы для результата
      const resultSelectors = [
        '.result',
        '#result',
        '.output',
        '[class*="result"]',
        '[id*="result"]',
        'div[class*="calc"]',
        'span[class*="result"]'
      ];
      
      for (const selector of resultSelectors) {
        try {
          const resultElement = await page.$(selector);
          if (resultElement) {
            result = await page.evaluate(el => el.textContent.trim(), resultElement);
            if (result && result.length > 0) {
              break;
            }
          }
        } catch (e) {}
      }
      
      // Если не нашли результат в специальном элементе, ищем в тексте страницы
      if (!result || result.length === 0) {
        const pageText = await page.evaluate(() => document.body.innerText);
        // Ищем паттерн с днями, часами, минутами
        const match = pageText.match(/(\d+\s*(?:день|дня|дней|д)\s*\d+\s*(?:час|часа|часов|ч)\s*\d+\s*(?:минут|минуты|м|минута))/i);
        if (match) {
          result = match[1];
        }
      }
      
      // Если все еще не нашли, вычисляем сами
      if (!result || result.length === 0) {
        const dateObj1 = new Date(`${date1} ${time1}`);
        const dateObj2 = new Date(`${date2} ${time2}`);
        
        if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
          throw new Error('Неверный формат даты/времени');
        }
        
        const diff = Math.abs(dateObj2 - dateObj1);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        result = `${days}д ${hours}ч ${minutes}м ${seconds}с`;
      }
      
      return result;
    } else {
      throw new Error('Не найдены поля ввода на странице');
    }
  } catch (error) {
    // В случае ошибки вычисляем разницу сами
    try {
      const dateObj1 = new Date(`${date1} ${time1}`);
      const dateObj2 = new Date(`${date2} ${time2}`);
      
      if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
        throw new Error('Неверный формат даты/времени');
      }
      
      const diff = Math.abs(dateObj2 - dateObj1);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      return `${days}д ${hours}ч ${minutes}м ${seconds}с`;
    } catch (calcError) {
      throw new Error(`Ошибка расчета: ${error.message}`);
    }
  } finally {
    await browser.close();
  }
}

async function runCalculation() {
  const calculationType = inputData.calculationType || 'first';
  
  let date1, time1, date2, time2;
  
  if (calculationType === 'first') {
    date1 = inputData['Дата передачи'];
    time1 = inputData['Время передачи'];
    date2 = inputData['Дата возврата'];
    time2 = inputData['Время возврата'];
  } else {
    date1 = inputData['Дата передачи'];
    time1 = inputData['Время передачи'];
    date2 = inputData['Дата взятия тикета в работу сотрудником ЦКП'];
    time2 = inputData['Время взятия тикета в работу сотрудником ЦКП'];
  }
  
  if (!date1 || !time1 || !date2 || !time2) {
    console.error(JSON.stringify({ 
      error: 'Недостаточно данных для расчета', 
      success: false,
      received: { date1, time1, date2, time2 }
    }));
    process.exit(1);
  }
  
  try {
    const result = await calculateTimeDifference(date1, time1, date2, time2);
    console.log(JSON.stringify({ result: result, success: true }));
    process.exit(0);
  } catch (error) {
    console.error(JSON.stringify({ error: error.message, success: false }));
    process.exit(1);
  }
}

if (inputData) {
  runCalculation();
}

