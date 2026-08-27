const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");
const AppError = require("../utils/AppError");
const escapeRegex = require("../utils/escapeRegex");

async function listar({ search = "", status = "", rol = "", page = 0, pageSize = 10 }) {
  const filtro = {};

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filtro.$or = [
      { nombre: regex },
      { usuario: regex },
      { email: regex },
    ];
  }

  if (status) filtro.status = status;
  if (rol) filtro.rol = rol;

  const [items, total] = await Promise.all([
    Usuario.find(filtro)
      .sort({ createdAt: -1 })
      .skip(page * pageSize)
      .limit(pageSize),
    Usuario.countDocuments(filtro),
  ]);

  return { items, total };
}

async function directorio() {
  return Usuario.find({ status: "activo" })
    .select("nombre usuario email rol sucursal")
    .sort({ nombre: 1 });
}

async function obtener(id) {
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function crear(datos) {
  const { password, ...resto } = datos;
  if (!password || password.length < 8) {
    throw new AppError("La contraseña debe tener al menos 8 caracteres", 400);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return Usuario.create({ ...resto, passwordHash });
}

async function actualizar(id, datos) {
  const { password, ...resto } = datos;
  const cambios = { ...resto };

  if (password) {
    if (password.length < 8) {
      throw new AppError("La contraseña debe tener al menos 8 caracteres", 400);
    }
    cambios.passwordHash = await bcrypt.hash(password, 10);
  }

  const usuario = await Usuario.findByIdAndUpdate(id, cambios, {
    new: true,
    runValidators: true,
  });
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function desactivar(id) {
  const usuario = await Usuario.findByIdAndUpdate(
    id,
    { status: "inactivo" },
    { new: true }
  );
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function eliminar(id) {
  const usuario = await Usuario.findByIdAndDelete(id);
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function agregarObservacion(id, texto, autor) {
  if (!texto || !texto.trim()) {
    throw new AppError("La observación no puede estar vacía", 400);
  }

  const usuario = await Usuario.findByIdAndUpdate(
    id,
    { $push: { observaciones: { texto: texto.trim(), autor } } },
    { new: true, runValidators: true }
  );
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function eliminarObservacion(id, observacionId) {
  const usuario = await Usuario.findByIdAndUpdate(
    id,
    { $pull: { observaciones: { _id: observacionId } } },
    { new: true }
  );
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

module.exports = {
  listar, obtener, crear, actualizar, desactivar, eliminar,
  agregarObservacion, eliminarObservacion, directorio,
};
