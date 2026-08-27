const Actividad = require("../models/Actividad");
const AppError = require("../utils/AppError");

async function listar({ year, month } = {}) {
  const filtro = {};

  if (year && month) {
    const inicio = new Date(Number(year), Number(month) - 1, 1);
    const fin = new Date(Number(year), Number(month), 1);
    filtro.fechaActividad = { $gte: inicio, $lt: fin };
  }

  return Actividad.find(filtro)
    .populate("tecnico", "nombre")
    .sort({ fechaActividad: 1 });
}

async function obtener(id) {
  const actividad = await Actividad.findById(id).populate("tecnico", "nombre");
  if (!actividad) throw new AppError("Actividad no encontrada", 404);
  return actividad;
}

async function crear(datos, creadoPor) {
  return Actividad.create({ ...datos, creadoPor });
}

async function actualizar(id, datos) {
  const actividad = await Actividad.findByIdAndUpdate(id, datos, { new: true, runValidators: true });
  if (!actividad) throw new AppError("Actividad no encontrada", 404);
  return actividad;
}

async function eliminar(id) {
  const actividad = await Actividad.findByIdAndDelete(id);
  if (!actividad) throw new AppError("Actividad no encontrada", 404);
  return actividad;
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
