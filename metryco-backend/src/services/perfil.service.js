const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const Usuario = require("../models/Usuario");
const AuditLog = require("../models/AuditLog");
const AppError = require("../utils/AppError");
const { destinoFotos, destinoFirmas } = require("../middleware/upload");

const AVATAR_COLORES = ["#2563EB", "#16A34A", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#0F172A"];

async function obtener(id) {
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function cambiarPassword(id, passwordActual, passwordNueva) {
  const usuario = await Usuario.findById(id).select("+passwordHash");
  if (!usuario) throw new AppError("Usuario no encontrado", 404);

  const ok = await bcrypt.compare(passwordActual, usuario.passwordHash);
  if (!ok) throw new AppError("La contraseña actual es incorrecta", 400);

  usuario.passwordHash = await bcrypt.hash(passwordNueva, 10);
  await usuario.save();
  return { ok: true };
}

const HEX_VALIDO = /^#[0-9A-Fa-f]{6}$/;

// Los 8 de AVATAR_COLORES son sugerencias rápidas, pero el usuario puede
// elegir cualquier color libre desde el selector nativo del navegador — solo
// se valida que sea un hex bien formado, no que esté en la lista.
async function elegirColorAvatar(id, color) {
  if (!HEX_VALIDO.test(color)) throw new AppError("Color de avatar inválido", 400);
  const usuario = await Usuario.findByIdAndUpdate(
    id,
    { avatarColor: color, fotoUrl: undefined },
    { new: true }
  );
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  return usuario;
}

async function subirFoto(id, file) {
  if (!file) throw new AppError("No se recibió ninguna imagen", 400);
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    fs.unlink(file.path, () => {});
    throw new AppError("Usuario no encontrado", 404);
  }

  if (usuario.fotoUrl) fs.unlink(path.join(destinoFotos, usuario.fotoUrl), () => {});
  usuario.fotoUrl = file.filename;
  usuario.avatarColor = undefined;
  await usuario.save();
  return usuario;
}

async function eliminarFoto(id) {
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  if (usuario.fotoUrl) {
    fs.unlink(path.join(destinoFotos, usuario.fotoUrl), () => {});
    usuario.fotoUrl = undefined;
    await usuario.save();
  }
  return usuario;
}

async function subirFirma(id, file) {
  if (!file) throw new AppError("No se recibió ninguna imagen", 400);
  const usuario = await Usuario.findById(id);
  if (!usuario) {
    fs.unlink(file.path, () => {});
    throw new AppError("Usuario no encontrado", 404);
  }

  if (usuario.firmaUrl) fs.unlink(path.join(destinoFirmas, usuario.firmaUrl), () => {});
  usuario.firmaUrl = file.filename;
  await usuario.save();
  return usuario;
}

async function eliminarFirma(id) {
  const usuario = await Usuario.findById(id);
  if (!usuario) throw new AppError("Usuario no encontrado", 404);
  if (usuario.firmaUrl) {
    fs.unlink(path.join(destinoFirmas, usuario.firmaUrl), () => {});
    usuario.firmaUrl = undefined;
    await usuario.save();
  }
  return usuario;
}

/** Últimos inicios de sesión (exitosos y fallidos) de la propia cuenta. */
async function actividadReciente(usuarioNombre) {
  return AuditLog.find({
    "usuario.usuario": usuarioNombre,
    accion: { $in: ["login_exitoso", "login_fallido"] },
  })
    .sort({ fecha: -1 })
    .limit(10);
}

module.exports = {
  obtener, cambiarPassword, elegirColorAvatar, subirFoto, eliminarFoto,
  subirFirma, eliminarFirma, actividadReciente, AVATAR_COLORES,
};
