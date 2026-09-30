const Usuario = require("../models/Usuario");

/**
 * Construye una entrada de historial/auditoría para adjuntar a un documento
 * (Reporte, Asignacion, Certificado...).
 *
 * Guarda un *snapshot* del usuario (id + usuario + nombre + rol) para que el
 * historial siga siendo legible aunque después se renombre o desactive esa
 * cuenta. Nunca se sobreescriben entradas anteriores: siempre se hace push.
 *
 * @param {{id:string, usuario:string, rol:string}} reqUser  req.user del JWT.
 * @param {string} accion   Etiqueta corta, ej. "creado", "estado.certificado→autorizado".
 * @param {object} [detalle]  Datos extra opcionales (antes/después, motivo, etc.).
 */
async function crearEvento(reqUser, accion, detalle) {
  let nombre = reqUser?.usuario;

  if (reqUser?.id) {
    const u = await Usuario.findById(reqUser.id).select("nombre").lean();
    if (u?.nombre) nombre = u.nombre;
  }

  return {
    accion,
    usuario: reqUser
      ? { id: reqUser.id, usuario: reqUser.usuario, nombre, rol: reqUser.rol }
      : undefined,
    fecha: new Date(),
    detalle: detalle ?? undefined,
  };
}

module.exports = { crearEvento };
