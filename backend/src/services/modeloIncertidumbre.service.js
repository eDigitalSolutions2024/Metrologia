const ModeloIncertidumbre = require("../models/ModeloIncertidumbre");
const AppError = require("../utils/AppError");

async function listar({ magnitud = "", tipoInstrumento = "", soloActivos = "true" } = {}) {
  const match = {};
  if (magnitud) match.magnitud = String(magnitud).toLowerCase();
  if (tipoInstrumento) match.tipoInstrumento = String(tipoInstrumento).toLowerCase();
  if (soloActivos === "true" || soloActivos === true) match.activo = true;
  return ModeloIncertidumbre.find(match).sort({ magnitud: 1, tipoInstrumento: 1, nombre: 1 });
}

async function obtener(id) {
  const m = await ModeloIncertidumbre.findById(id);
  if (!m) throw new AppError("Modelo de incertidumbre no encontrado", 404);
  return m;
}

async function crear(datos, usuarioId) {
  if (!datos.magnitud || !datos.tipoInstrumento || !datos.nombre) {
    throw new AppError("magnitud, tipoInstrumento y nombre son obligatorios", 400);
  }
  return ModeloIncertidumbre.create({
    ...datos,
    magnitud: String(datos.magnitud).toLowerCase(),
    tipoInstrumento: String(datos.tipoInstrumento).toLowerCase(),
    creadoPor: usuarioId,
  });
}

async function actualizar(id, datos) {
  const cambios = { ...datos };
  if (datos.magnitud) cambios.magnitud = String(datos.magnitud).toLowerCase();
  if (datos.tipoInstrumento) cambios.tipoInstrumento = String(datos.tipoInstrumento).toLowerCase();
  const m = await ModeloIncertidumbre.findByIdAndUpdate(id, cambios, { new: true, runValidators: true });
  if (!m) throw new AppError("Modelo de incertidumbre no encontrado", 404);
  return m;
}

async function eliminar(id) {
  const m = await ModeloIncertidumbre.findByIdAndUpdate(id, { activo: false }, { new: true });
  if (!m) throw new AppError("Modelo de incertidumbre no encontrado", 404);
  return m; // baja lógica: los cálculos históricos siguen refiriéndolo
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
