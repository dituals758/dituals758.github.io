// ============================================================
// НАСТРОЙКА (выполнить один раз)
// ============================================================
function setup() {
  const props = PropertiesService.getScriptProperties();
  // Замените на реальные значения:
  props.setProperty('SPREADSHEET_ID', 'ВАШ_ID_ТАБЛИЦЫ');
  props.setProperty('API_TOKEN', 'ВАШ_СЕКРЕТНЫЙ_ТОКЕН_МИНИМУМ_32_СИМВОЛА');
  props.setProperty('SHEET_NAME', 'Операции'); // имя листа
}

// ============================================================
// ОБРАБОТКА POST-ЗАПРОСОВ
// ============================================================
function doPost(e) {
  try {
    // 1. Проверка токена (из заголовка или тела)
    const props = PropertiesService.getScriptProperties();
    const expectedToken = props.getProperty('API_TOKEN');
    const receivedToken = e.parameter.token || 
                          (e.postData && JSON.parse(e.postData.contents).token);
    if (receivedToken !== expectedToken) {
      return jsonResponse({ status: 'error', message: 'Unauthorized' }, 401);
    }

    // 2. Парсинг данных
    const data = JSON.parse(e.postData.contents);
    if (!data.type || !data.amount || !data.category) {
      return jsonResponse({ status: 'error', message: 'Missing required fields' }, 400);
    }

    // 3. Запись в таблицу
    const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(props.getProperty('SHEET_NAME'));
    
    sheet.appendRow([
      new Date(),                // Timestamp
      data.type,                 // 'income' | 'expense'
      Number(data.amount),       // Сумма
      data.category,             // Категория (например, '🛒 Продукты')
      data.note || '',           // Комментарий
      data.account || 'Платинум' // Счёт (опционально)
    ]);

    return jsonResponse({ status: 'success' });

  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() }, 500);
  }
}

// Вспомогательная функция для JSON-ответа
function jsonResponse(obj, code) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Для проверки, что скрипт жив (можно удалить после настройки)
function doGet() {
  return ContentService.createTextOutput('API is running');
}