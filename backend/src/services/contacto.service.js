const Contacto = require("../models/Contacto");
const AppError = require("../utils/AppError");

async function listarPorCliente(clienteId) {
  return Contacto.find({ cliente: clienteId, status: "activo" }).sort({ nombre: 1 });
}

async function crear(clienteId, datos) {
  if (!datos.nombre) throw new AppError("El nombre del contacto es obligatorio", 400);
  return Contacto.create({ ...datos, cliente: clienteId });
}

async function actualizar(clienteId, id, datos) {
  const contacto = await Contacto.findOneAndUpdate(
    { _id: id, cliente: clienteId },
    datos,
    { new: true, runValidators: true }
  );
  if (!contacto) throw new AppError("Contacto no encontrado", 404);
  return contacto;
}

async function eliminar(clienteId, id) {
  const contacto = await Contacto.findOneAndUpdate(
    { _id: id, cliente: clienteId },
    { status: "inactivo" },
    { new: true }
  );
  if (!contacto) throw new AppError("Contacto no encontrado", 404);
  return contacto;
}

module.exports = { listarPorCliente, crear, actualizar, eliminar };
