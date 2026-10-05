const auditoriaService = require("../services/auditoria.service");

/**
 * Registra una acción sensible en el log de auditoría, pero solo si la
 * respuesta terminó en 2xx — así un borrado que falló (404, 403, etc.) no
 * queda registrado como si hubiera ocurrido. Se coloca ANTES del controlador
 * en la ruta; el registro real pasa cuando la respuesta ya se envió
 * (evento "finish"), sin bloquear ni retrasar la respuesta al cliente.
 *
 * `entidad` y el id se resuelven en el momento del log: por default el id es
 * `req.params.id` (cubre la inmensa mayoría de rutas tipo DELETE/PATCH /:id).
 */
function auditar(accion, entidad) {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        auditoriaService.registrar({
          accion,
          entidad,
          entidadId: req.params.id,
          reqUser: req.user,
          ip: req.ip,
        });
      }
    });
    next();
  };
}

module.exports = auditar;
