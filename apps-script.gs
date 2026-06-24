/**
 * Registro de Consumos — Apps Script backend
 *
 * Este script vive dentro del Google Spreadsheet y expone un endpoint HTTP
 * público que la app web usa para leer/escribir registros y subir archivos
 * a Drive. Permite que cualquier usuario use la app SIN iniciar sesión con
 * su cuenta Google: las operaciones se ejecutan con TU cuenta (la que
 * desplegó el script).
 *
 * --- CÓMO DESPLEGAR ---
 *
 * 1. Abre la planilla:
 *    https://docs.google.com/spreadsheets/d/1e6v7yPP05w05OIfsHRyyU3cfXXDPhVzg43TL_HvXihU
 *
 * 2. Menú: Extensiones > Apps Script
 *
 * 3. Borra el contenido del archivo `Código.gs` y pega ESTE archivo completo.
 *
 * 4. Guarda (Ctrl+S). Pon un nombre al proyecto (ej: "Registro de Consumos API").
 *
 * 5. Botón "Implementar" (arriba a la derecha) > "Nueva implementación".
 *    - Tipo: "Aplicación web"
 *    - Descripción: lo que quieras
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario"
 *    - Click "Implementar"
 *
 * 6. La primera vez te pedirá autorizar. Acepta los permisos
 *    (Sheets + Drive). Si aparece "Esta app no está verificada" haz click en
 *    "Avanzado" > "Ir a [nombre] (no seguro)" y continúa. Es seguro: es tu
 *    propio script con tu propia cuenta.
 *
 * 7. Copia la URL que aparece bajo "URL de la app web". Termina en /exec.
 *
 * 8. Pega esa URL en `proto/sync.jsx`, en la constante APPS_SCRIPT_URL.
 *
 * --- ACTUALIZACIONES ---
 *
 * Si modificas este script: Implementar > "Administrar implementaciones"
 * > edita la existente (ícono de lápiz) > Versión "Nueva versión" >
 * Implementar. La URL no cambia.
 */

const CONFIG = {
  // 👉 INSTANCIA ANDO. Si copias este archivo a la planilla Euro, cambia este ID.
  SPREADSHEET_ID: "1Aa0daLD5uyHbgQuxWGsxUADJXw4eqU7Qhr7kyDjK7_w",
  FOLDERS: {
    ENEL_POR_PROCESAR:  "1_9EbWKV-G81PbIs0Pp5v9GwfsDADe-nz",
    ENEL_PROCESADOS:    "1L042MBiUp3ChzOVTAfkVp8kI6X3vyVk9",
    AGUAS_POR_PROCESAR: "1YgqYW-hoHD5T550-99Y22SQ0wuY3XrkE",
    AGUAS_PROCESADOS:   "1LrI8Oe5_CE68ptdd6Hh0Ixu-xfEwOz6R",
    FOTOS_POR_COMPLETAR:"1WbBQXZBKixe-5nd54G07xOsdo0P6Qs_k",
    FOTOS_PROCESADOS:   "13oru7kNnvMW5S8jV_sKPQyMvt80luFrP",
  },
  HEADERS: {
    Combustible:    ["Link", "Fecha", "Consumo", "Costo", "Empresa", "Sucursal", "Tipo", "Proveedor", "Estado"],
    Electricidad:   ["Link PDF", "Número de cliente", "Fecha", "Consumo total", "Costo ($)", "Empresa", "Sucursal", "Tipo de consumo", "Proveedor", "Estado"],
    Agua:           ["Link PDF", "Número de cliente", "Fecha emisión", "Consumo total", "Costo ($)", "Empresa", "Sucursal", "Tipo de consumo", "Proveedor", "Subcategoría", "Estado"],
    "N° de cliente":["Número de cliente", "Empresa", "Sucursal", "Tipo de consumo", "Proveedor"],
    "Fill out":     ["Submission ID", "Submission time", "Nombre Usuario", "Nombre sucursal", "Mes de registro", "N° trabajadores", "N° trabajadoras", "m2 totales", "% Avance", "URL Excel Petróleo", "URL Excel Gas", "Procesado"],
    // Flujo "Tomar foto" — una fila por foto subida; pendiente hasta que se completen datos.
    Fotos:          ["File ID", "Drive URL", "Fecha subida", "Tipo", "Sucursal", "Subcategoría", "Período", "Status", "Fecha completado", "Consumo", "Unidad", "Costo", "Proveedor", "Notas"],
  },
};

// ----- HTTP entrypoints --------------------------------------------------

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "read";
    if (action === "read") return jsonOut(readAll());
    if (action === "getConfig") return jsonOut(getConfigValue(e.parameter.key));
    if (action === "getConfigSucursales") return jsonOut(getConfigSucursales());
    if (action === "getEmissions") return jsonOut(getEmissions());
    if (action === "getFotos") return jsonOut(getFotos());
    if (action === "ping") return jsonOut({ ok: true, pong: new Date().toISOString() });
    return jsonOut({ error: "unknown action: " + action });
  } catch (err) {
    return jsonOut({ error: String(err && err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const action = body.action;
    if (action === "setConfig") {
      setConfigValue(body.key, body.value);
      return jsonOut({ ok: true });
    }
    if (action === "setConfigSucursales") {
      setConfigSucursales(body.rows || []);
      return jsonOut({ ok: true });
    }
    if (action === "setEmissions") {
      setEmissions(body.rows || []);
      return jsonOut({ ok: true });
    }
    if (action === "append") {
      appendRows(body.sheet, body.values || []);
      return jsonOut({ ok: true, appended: (body.values || []).length });
    }
    if (action === "upload") {
      return jsonOut(uploadFile(body.name, body.mimeType, body.base64, body.folderId));
    }
    if (action === "move") {
      moveFile(body.fileId, body.fromFolderId, body.toFolderId);
      return jsonOut({ ok: true });
    }
    if (action === "update") {
      updateCell(body.sheet, body.row, body.col, body.value);
      return jsonOut({ ok: true });
    }
    if (action === "init") {
      ensureSheets();
      return jsonOut({ ok: true });
    }
    return jsonOut({ error: "unknown action: " + action });
  } catch (err) {
    return jsonOut({ error: String(err && err.message || err) });
  }
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ----- Operations --------------------------------------------------------

function readAll() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const result = {};
  ["Combustible", "Electricidad", "Agua"].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) { result[name] = []; return; }
    result[name] = sheet.getDataRange().getDisplayValues();
  });
  return result;
}

function appendRows(sheetName, values) {
  if (!sheetName) throw new Error("sheet name missing");
  if (!values || !values.length) return;
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = CONFIG.HEADERS[sheetName];
    if (headers) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  const start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, values.length, values[0].length).setValues(values);
}

function updateCell(sheetName, row, col, value) {
  if (!sheetName) throw new Error("sheet name missing");
  if (!row || !col) throw new Error("row/col missing");
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("sheet not found: " + sheetName);
  sheet.getRange(row, col).setValue(value);
}

function uploadFile(name, mimeType, base64, folderId) {
  if (!folderId) throw new Error("folderId missing");
  const bytes = Utilities.base64Decode(base64 || "");
  const blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", name || "archivo");
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  return { id: file.getId(), link: file.getUrl() };
}

function moveFile(fileId, fromFolderId, toFolderId) {
  const file = DriveApp.getFileById(fileId);
  if (toFolderId) DriveApp.getFolderById(toFolderId).addFile(file);
  if (fromFolderId) DriveApp.getFolderById(fromFolderId).removeFile(file);
}

function ensureSheets() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  Object.keys(CONFIG.HEADERS).forEach(function (name) {
    if (!ss.getSheetByName(name)) {
      const sh = ss.insertSheet(name);
      const headers = CONFIG.HEADERS[name];
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });
}

// ----- Config key/value store (hoja "Config") ----------------------------

function getConfigValue(key) {
  if (!key) return { value: null };
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Config");
  if (!sheet) return { value: null };
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      try { return { value: JSON.parse(data[i][1]) }; } catch (e) { return { value: null }; }
    }
  }
  return { value: null };
}

function setConfigValue(key, value) {
  if (!key) throw new Error("key missing");
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Config");
  if (!sheet) {
    sheet = ss.insertSheet("Config");
    sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
  }
  var data = sheet.getDataRange().getValues();
  var json = JSON.stringify(value);
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(json);
      return;
    }
  }
  sheet.appendRow([key, json]);
}

// ----- Config sucursales (tabla relacional, una fila por subcategoría) ----

var CONFIG_SUC_SHEET = "Config Sucursales";
var CONFIG_SUC_HEADERS = [
  "Sucursal ID", "Nombre", "Dirección", "Activa", "Tipo consumo", "Subcat ID",
  "Sistema eléctrico", "Tipo", "Tipo (otro)", "Uso", "Unidad",
  "Proveedor", "Proveedor (otro)", "N° cliente",
];

function getConfigSucursales() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG_SUC_SHEET);
  if (!sheet) return { rows: [] };
  var data = sheet.getDataRange().getValues();
  return { rows: data.slice(1) }; // sin encabezado
}

function setConfigSucursales(rows) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG_SUC_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG_SUC_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, CONFIG_SUC_HEADERS.length).setValues([CONFIG_SUC_HEADERS]);
  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, CONFIG_SUC_HEADERS.length).setValues(rows);
  }
}

// ----- Factores de emisión (hoja "Emisiones") ----------------------------
// Una fila por entrada. Scopes: factor-empresa | factor-sucursal | refrigerante | meta-empresa | meta-sucursal.

var EMISSIONS_SHEET = "Emisiones";
var EMISSIONS_HEADERS = [
  "Scope", "Sucursal ID", "Key", "Value", "Pending Review", "Refrig Tipo", "Refrig Mes",
];

function getEmissions() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(EMISSIONS_SHEET);
  if (!sheet) return { rows: [] };
  var data = sheet.getDataRange().getValues();
  return { rows: data.slice(1) };
}

function setEmissions(rows) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(EMISSIONS_SHEET);
  if (!sheet) sheet = ss.insertSheet(EMISSIONS_SHEET);
  sheet.clear();
  sheet.getRange(1, 1, 1, EMISSIONS_HEADERS.length).setValues([EMISSIONS_HEADERS]);
  if (rows && rows.length) {
    sheet.getRange(2, 1, rows.length, EMISSIONS_HEADERS.length).setValues(rows);
  }
}

// ----- Fotos (módulo "Tomar foto") --------------------------------------
// La hoja "Fotos" se crea automáticamente en el primer `append` usando
// CONFIG.HEADERS.Fotos. uploadFile / appendRows / updateCell / moveFile ya
// existen; sólo agregamos el getter de lectura de la cola.
function getFotos() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName("Fotos");
  if (!sheet) return { rows: [] };
  var data = sheet.getDataRange().getDisplayValues();
  return { rows: data.slice(1) };
}
