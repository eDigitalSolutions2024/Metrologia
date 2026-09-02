const mongoose = require("mongoose");
const Equipo = require("../models/Equipo");
const Cliente = require("../models/Cliente");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");
const qr = require("../utils/qr");
const { publicWebUrl } = require("../config/env");

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
  if (!datos.idInterno) throw new AppError("El ID interno es obligatorio", 400);
  return Equipo.create({ ...datos, registradoPor: usuarioId });
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
