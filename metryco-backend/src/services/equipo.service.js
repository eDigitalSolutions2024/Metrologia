const mongoose = require("mongoose");
const Equipo = require("../models/Equipo");
const Cliente = require("../models/Cliente");
const Counter = require("../models/Counter");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");
const qr = require("../utils/qr");
const { publicWebUrl } = require("../config/env");

// Palabras que no aportan identidad al nombre de la empresa (razón social /
// conectores comunes) — se ignoran al armar el prefijo.
const PALABRAS_IGNORADAS = new Set([
  "SA", "CV", "SC", "SAPI", "SOFOM", "SOFIPO", "SRL", "CIA",
  "DE", "DEL", "LA", "LAS", "EL", "LOS", "Y",
]);

/** "Aceros del Bravo SA de CV" -> "AB" · "Intermex Manufactura" -> "IM" */
function prefijoDesdeNombre(nombre = "") {
  const palabras = nombre
    .toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !PALABRAS_IGNORADAS.has(w));

  if (!palabras.length) return "EQ";
  if (palabras.length === 1) return palabras[0].slice(0, 3);
  return palabras.map((w) => w[0]).join("").slice(0, 4);
}

/**
 * ID interno consecutivo por CLIENTE (no global), con prefijo ligado a su
 * nombre para que sea identificable a simple vista: "AB-001", "AB-002"...
 * Solo se usa cuando el usuario no captura uno propio (código de activo del
 * cliente) — el contador es atómico así que es seguro con concurrencia.
 */
async function siguienteIdInterno(clienteId) {
  const cliente = await Cliente.findById(clienteId).select("nombre nombreComercial");
  const prefijo = prefijoDesdeNombre(cliente?.nombreComercial || cliente?.nombre);

  for (let intento = 0; intento < 20; intento++) {
    const counter = await Counter.findByIdAndUpdate(
      `EQ-${clienteId}`,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    const idInterno = `${prefijo}-${String(counter.seq).padStart(3, "0")}`;
    // Por si alguien ya había capturado ese mismo código a mano antes.
    if (!(await Equipo.exists({ cliente: clienteId, idInterno }))) return idInterno;
  }
  throw new AppError("No se pudo generar un ID interno único, intenta capturarlo manualmente", 500);
}

function urlInterna(id) {
  return `${publicWebUrl.replace(/\/$/, "")}/equipos/${id}/editar`;
}

async function listar({ search = "", clienteId = "", categoria = "", incluirInactivos = false, page = 0, pageSize = 10 }) {
  const match = {};
  if (!incluirInactivos) match.status = "activo";
  if (clienteId && mongoose.isValidObjectId(clienteId)) {
    match.cliente = new mongoose.Types.ObjectId(clienteId);
  }
  if (categoria) match.categoria = categoria;
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    match.$or = [{ idInterno: rx }, { marca: rx }, { modelo: rx }, { serie: rx }, { descripcion: rx }];
  }

  const [items, total] = await Promise.all([
    Equipo.find(match)
      .populate("cliente", "nombre rfc")
      .populate("patronesSugeridos", "codigo nombre")
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    Equipo.countDocuments(match),
  ]);
  return { items, total };
}

async function obtener(id) {
  const equipo = await Equipo.findById(id)
    .populate("cliente", "nombre rfc")
    .populate("patronesSugeridos", "codigo nombre categoria");
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return equipo;
}

async function crear(datos, usuarioId) {
  if (!mongoose.isValidObjectId(datos.cliente)) throw new AppError("Cliente inválido", 400);
  if (!(await Cliente.exists({ _id: datos.cliente }))) throw new AppError("Cliente no encontrado", 404);
  const idInterno = datos.idInterno?.trim() || (await siguienteIdInterno(datos.cliente));
  return Equipo.create({ ...datos, idInterno, registradoPor: usuarioId });
}

async function actualizar(id, datos) {
  if (datos.cliente && !mongoose.isValidObjectId(datos.cliente)) {
    throw new AppError("Cliente inválido", 400);
  }
  const equipo = await Equipo.findByIdAndUpdate(id, datos, { new: true, runValidators: true });
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return equipo;
}

// "Eliminar" un equipo es un soft-delete (inactivar): un equipo de cliente
// puede tener historial de calibraciones detrás, borrarlo de verdad
// rompería esas referencias. Deja de aparecer en los listados normales
// (listar() ya filtra por status:"activo" salvo que se pida incluirInactivos)
// pero sigue existiendo para consultas directas por id.
async function eliminar(id) {
  const equipo = await Equipo.findByIdAndUpdate(id, { status: "inactivo" }, { new: true });
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return equipo;
}

async function reactivar(id) {
  const equipo = await Equipo.findByIdAndUpdate(id, { status: "activo" }, { new: true });
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return equipo;
}

async function qrPng(id) {
  const equipo = await Equipo.findById(id).select("_id");
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return qr.pngBuffer(urlInterna(equipo._id));
}

async function qrSvg(id) {
  const equipo = await Equipo.findById(id).select("_id");
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return qr.svg(urlInterna(equipo._id));
}

module.exports = { listar, obtener, crear, actualizar, eliminar, reactivar, qrPng, qrSvg };
