const mongoose = require("mongoose");
const Equipo = require("../models/Equipo");
const Cliente = require("../models/Cliente");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");

async function listar({ search = "", clienteId = "", categoria = "", page = 0, pageSize = 10 }) {
  const match = {};
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

async function eliminar(id) {
  const equipo = await Equipo.findByIdAndDelete(id);
  if (!equipo) throw new AppError("Equipo no encontrado", 404);
  return equipo;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
