const RazonSocial = require("../models/RazonSocial");
const AppError = require("../utils/AppError");

async function listar({ soloActivas = "" } = {}) {
  const match = {};
  if (soloActivas === "true" || soloActivas === true) match.activo = true;
  return RazonSocial.find(match).sort({ nombre: 1 });
}

async function obtener(id) {
  const rs = await RazonSocial.findById(id);
  if (!rs) throw new AppError("Razón social no encontrada", 404);
  return rs;
}

async function crear(datos) {
  if (!datos.nombre) throw new AppError("El nombre es obligatorio", 400);
  return RazonSocial.create(datos);
}

async function actualizar(id, datos) {
  const rs = await RazonSocial.findByIdAndUpdate(id, datos, { new: true, runValidators: true });
  if (!rs) throw new AppError("Razón social no encontrada", 404);
  return rs;
}

async function eliminar(id) {
  const rs = await RazonSocial.findByIdAndUpdate(id, { activo: false }, { new: true });
  if (!rs) throw new AppError("Razón social no encontrada", 404);
  return rs;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
