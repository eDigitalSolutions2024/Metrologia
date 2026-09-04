const ExcelJS = require("exceljs");
const { parse: parseCsvSync } = require("csv-parse/sync");
const Performance = require("../models/Performance");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");

/**
 * Fórmula EXACTA del legacy (php/input_form.php). Determinística.
 *   tolerancia = nominal·(%RDG/100) + escalaTotal·(%FS/100) + unidades
 */
function calcularPunto(p) {
  const nominal = Number(p.nominal);
  const escala = Number(p.escalaTotal);
  const rdg = Number(p.porcentajeRdg);
  const fs = Number(p.porcentajeFs);
  const unidades = Number(p.unidades);
  const incert = Number(p.incertidumbre);

  if ([nominal, escala, rdg, fs, unidades].some((n) => !Number.isFinite(n))) {
    return { ...p, minimo: null, maximo: null, minimoReal: null, maximoReal: null };
  }

  const tolerancia = nominal * (rdg / 100) + escala * (fs / 100) + unidades;
  const minimo = nominal - tolerancia;
  const maximo = nominal + tolerancia;
  const tieneIncert = Number.isFinite(incert);

  return {
    ...p,
    minimo: round(minimo),
    maximo: round(maximo),
    minimoReal: tieneIncert ? round(minimo + incert) : null,
    maximoReal: tieneIncert ? round(maximo - incert) : null,
  };
}

const round = (x) => Math.round(x * 1e6) / 1e6;

function normalizarPuntos(puntos = []) {
  return puntos.map(calcularPunto);
}

// --- Importación desde Excel/CSV -------------------------------------
// Formato esperado (encabezados en la primera fila, tolerante a acentos/
// mayúsculas/espacios): Prueba, Nominal, Unidad, Escala Total, %RDG, %FS,
// Unidades, Incertidumbre — las mismas columnas que captura el formulario.
const ALIAS_COLUMNA = {
  prueba: "prueba",
  nominal: "nominal",
  unidad: "unidad",
  unidades: "unidades",
  escala: "escalaTotal",
  escalatotal: "escalaTotal",
  rdg: "porcentajeRdg",
  "%rdg": "porcentajeRdg",
  porcentajerdg: "porcentajeRdg",
  fs: "porcentajeFs",
  "%fs": "porcentajeFs",
  porcentajefs: "porcentajeFs",
  incertidumbre: "incertidumbre",
};

const DIACRITICOS = new RegExp("[̀-ͯ]", "g");

function normalizarEncabezado(h) {
  return String(h ?? "")
    .normalize("NFD").replace(DIACRITICOS, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]/g, "");
}

function valorCelda(v) {
  if (v == null) return v;
  if (typeof v === "object") {
    if (v.text !== undefined) return v.text;
    if (v.result !== undefined) return v.result;
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("");
  }
  return v;
}

async function filasDesdeExcel(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const hoja = wb.worksheets[0];
  if (!hoja) throw new AppError("El archivo no tiene hojas", 400);
  const filas = [];
  hoja.eachRow((row) => {
    const valores = Array.isArray(row.values) ? row.values.slice(1) : [];
    filas.push(valores.map(valorCelda));
  });
  return filas;
}

function filasDesdeCsv(buffer) {
  return parseCsvSync(buffer, { columns: false, skip_empty_lines: true, trim: true, bom: true });
}

async function importarArchivo(buffer, nombreArchivo = "") {
  const esCsv = /\.csv$/i.test(nombreArchivo);
  const filas = esCsv ? filasDesdeCsv(buffer) : await filasDesdeExcel(buffer);

  if (!filas.length) throw new AppError("El archivo está vacío", 400);

  const columnas = filas[0].map((h) => ALIAS_COLUMNA[normalizarEncabezado(h)] || null);
  if (!columnas.some(Boolean)) {
    throw new AppError(
      "No se reconocen las columnas. Usa los encabezados: Prueba, Nominal, Unidad, Escala Total, %RDG, %FS, Unidades, Incertidumbre",
      400
    );
  }

  const puntos = filas
    .slice(1)
    .filter((fila) => fila.some((v) => v !== undefined && v !== null && String(v).trim() !== ""))
    .map((fila) => {
      const punto = {};
      columnas.forEach((campo, i) => {
        if (!campo) return;
        const valor = fila[i];
        if (valor === undefined || valor === null || String(valor).trim() === "") return;
        punto[campo] = campo === "prueba" || campo === "unidad" ? String(valor).trim() : Number(valor);
      });
      return punto;
    });

  if (!puntos.length) throw new AppError("No se encontraron filas de datos en el archivo", 400);

  return normalizarPuntos(puntos);
}

async function listar({ search = "", magnitud = "", page = 0, pageSize = 10 }) {
  const match = {};
  if (magnitud) match.magnitud = magnitud;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ nombre: rx }, { comentarios: rx }, { tipoInstrumento: rx }];
  }
  const [items, total] = await Promise.all([
    Performance.find(match).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize),
    Performance.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const perf = await Performance.findById(id);
  if (!perf) throw new AppError("Performance no encontrado", 404);
  return perf;
}

async function crear(datos, usuarioId) {
  if (!datos.nombre) throw new AppError("El nombre es obligatorio", 400);
  return Performance.create({
    ...datos,
    puntos: normalizarPuntos(datos.puntos),
    creadoPor: usuarioId,
  });
}

async function actualizar(id, datos) {
  const cambios = { ...datos };
  if (datos.puntos) cambios.puntos = normalizarPuntos(datos.puntos);
  const perf = await Performance.findByIdAndUpdate(id, cambios, { new: true, runValidators: true });
  if (!perf) throw new AppError("Performance no encontrado", 404);
  return perf;
}

async function eliminar(id) {
  const perf = await Performance.findByIdAndDelete(id);
  if (!perf) throw new AppError("Performance no encontrado", 404);
  return perf;
}

module.exports = { listar, obtener, crear, actualizar, eliminar, calcularPunto, normalizarPuntos, importarArchivo };
