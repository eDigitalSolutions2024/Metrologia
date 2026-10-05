const AuditLog = require("../models/AuditLog");

/**
 * Registra un evento de auditoría. Nunca debe tronar el flujo principal si
 * falla (ej. Mongo caído un instante) — se traga el error y solo lo imprime,
 * porque perder un log es mucho menos grave que romper un login o un borrado
 * real por un problema de auditoría.
 */
async function registrar({ accion, entidad, entidadId, reqUser, usuarioIntentado, exito = true, ip, detalle }) {
  try {
    await AuditLog.create({
      accion,
      entidad,
      entidadId,
      usuario: reqUser
        ? { id: reqUser.id, usuario: reqUser.usuario, rol: reqUser.rol }
        : { usuario: usuarioIntentado },
      exito,
      ip,
      detalle,
    });
  } catch (err) {
    console.error("No se pudo registrar auditoría:", err.message);
  }
}

async function listar({ accion = "", usuario = "", exito = "", desde = "", hasta = "", page = 0, pageSize = 50 }) {
  const match = {};
  if (accion) match.accion = accion;
  if (usuario) match["usuario.usuario"] = new RegExp(usuario, "i");
  if (exito === "true" || exito === true) match.exito = true;
  if (exito === "false" || exito === false) match.exito = false;
  if (desde || hasta) {
    match.fecha = {};
    if (desde) match.fecha.$gte = new Date(desde);
    if (hasta) match.fecha.$lte = new Date(hasta);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(match).sort({ fecha: -1 }).skip(page * pageSize).limit(pageSize),
    AuditLog.countDocuments(match),
  ]);
  return { items, total };
}

module.exports = { registrar, listar };
