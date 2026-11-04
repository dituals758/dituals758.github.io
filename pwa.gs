// ============================================================
// 1. НАСТРОЙКА (запустить ОДИН РАЗ)
// ============================================================
function setup() {
  const props = PropertiesService.getScriptProperties();
  // ВСТАВЬ СВОЙ ID ТАБЛИЦЫ (из ссылки браузера между /d/ и /edit)
  props.setProperty('SPREADSHEET_ID', '1g5uXnMcFByBzAVYdFLbwzijvKa8uTAjlNaZscZ64puY');
  props.setProperty('API_TOKEN', '3f8c1d94b2e7f6a0c5d8e1b4f7a2c9d3e6b8f1a4c7d0e3b6f9a2c5d8e1b4f7');
  props.setProperty('SHEET_NAME', 'Журнал');
}

// ============================================================
// 2. ОБРАБОТКА ЗАПРОСОВ
// ============================================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const expectedToken = props.getProperty('API_TOKEN');
    const data = e.parameter;

    if (data.token !== expectedToken) {
      return ContentService.createTextOutput("Error: Unauthorized");
    }

    if (!data.type || !data.amount || !data.category) {
      return ContentService.createTextOutput("Error: Missing fields");
    }

    const ss = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID'));
    const sheet = ss.getSheetByName(props.getProperty('SHEET_NAME') || 'Журнал');

    sheet.appendRow([
      new Date(),
      data.type,
      Number(data.amount),
      data.category,
      data.note || '',
      'Карта'
    ]);

    return ContentService.createTextOutput("OK");

  } catch (err) {
    return ContentService.createTextOutput("Error: " + err.toString());
  }
}