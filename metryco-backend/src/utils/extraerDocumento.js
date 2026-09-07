/**
 * Extrae texto plano de un Word (.docx) o Excel (.xlsx/.xls) subido por el
 * usuario, para dárselo como contexto a la IA que interpreta plantillas
 * (ver services/asistente.service.js). No intenta entender la estructura
 * aquí — solo "aplana" el documento a texto legible; quien interpreta el
 * contenido es el modelo.
 */
const ExcelJS = require("exceljs");
const mammoth = require("mammoth");
const AppError = require("../utils/AppError");

const MAX_CHARS = 12000; // cuida tokens/costo de la llamada a la IA

function valorCelda(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.text !== undefined) return v.text;
    if (v.result !== undefined) return v.result;
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

async function textoDesdeExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const bloques = [];
  wb.worksheets.forEach((hoja) => {
    const filas = [];
    hoja.eachRow((row) => {
      const valores = Array.isArray(row.values) ? row.values.slice(1) : [];
      const linea = valores.map(valorCelda).join(" | ").trim();
      if (linea.replace(/\|/g, "").trim()) filas.push(linea);
    });
    if (filas.length) bloques.push(`--- Hoja: ${hoja.name} ---\n${filas.join("\n")}`);
  });
  return bloques.join("\n\n");
}

async function textoDesdeWord(buffer) {
  const { value } = await mammoth.extractRawText({ buffer });
  return value || "";
}

/** @returns {Promise<string>} texto plano, recortado a un tamaño razonable. */
async function extraerTexto(buffer, nombreArchivo = "") {
  const ext = (nombreArchivo.match(/\.[^.]+$/)?.[0] || "").toLowerCase();
  let texto;
  if (ext === ".docx") {
    texto = await textoDesdeWord(buffer);
  } else if (ext === ".doc") {
    throw new AppError(
      "El formato .doc antiguo no se puede leer. Guarda el archivo como .docx (Word) o .xlsx (Excel) y vuelve a intentar.",
      400
    );
  } else if (ext === ".xlsx" || ext === ".xls") {
    texto = await textoDesdeExcel(buffer);
  } else {
    throw new AppError("Formato no soportado. Sube un Word (.docx) o Excel (.xlsx/.xls).", 400);
  }

  texto = (texto || "").trim();
  if (!texto) throw new AppError("No se pudo leer contenido del archivo (¿está vacío o es una imagen escaneada?).", 400);
  return texto.length > MAX_CHARS ? `${texto.slice(0, MAX_CHARS)}\n[...recortado...]` : texto;
}

module.exports = { extraerTexto };
