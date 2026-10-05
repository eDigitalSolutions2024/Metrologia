const Magnitud = require("../models/Magnitud");
const AppError = require("../utils/AppError");

async function listar({ soloActivas = "true" } = {}) {
  const match = {};
  if (soloActivas === "true" || soloActivas === true) match.activo = true;
  return Magnitud.find(match).sort({ orden: 1, nombre: 1 });
}

async function obtener(claveOId) {
  const q = /^[0-9a-f]{24}$/i.test(claveOId) ? { _id: claveOId } : { clave: String(claveOId).toLowerCase() };
  const mag = await Magnitud.findOne(q);
  if (!mag) throw new AppError("Magnitud no encontrada", 404);
  return mag;
}

async function crear(datos) {
  if (!datos.clave || !datos.nombre) throw new AppError("clave y nombre son obligatorios", 400);
  return Magnitud.create(datos);
}

async function actualizar(id, datos) {
  const mag = await Magnitud.findByIdAndUpdate(id, datos, { new: true, runValidators: true });
  if (!mag) throw new AppError("Magnitud no encontrada", 404);
  return mag;
}

module.exports = { listar, obtener, crear, actualizar };
